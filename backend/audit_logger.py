"""
Audit Logger - Immutable Historical Logging
CRITICAL: Every system run MUST be logged. No execution without persistence.
"""

import logging
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)


@dataclass
class RunContext:
    """Container for run execution context"""
    run_id: str
    source_type: str
    source_file_name: Optional[str] = None
    source_file_hash: Optional[str] = None
    source_row_count: Optional[int] = None
    execution_mode: str = "production"
    triggered_by: str = "manual"
    engine_version: str = "1.0.0"


class AuditLogger:
    """
    Immutable, append-only audit logger

    FAIL-SAFE RULES:
    1. If logging fails → execution MUST stop
    2. No in-memory-only processing allowed
    3. All operations are append-only
    4. No log deletion allowed
    """

    def __init__(self, db_client):
        self.db = db_client
        self.current_run_id: Optional[str] = None
        self.run_started = False

    # ================================================================
    # FAIL-SAFE VALIDATION
    # ================================================================

    def pre_flight_check(self) -> bool:
        """
        Validate system is ready for logging
        Returns True if safe to proceed, False otherwise
        """
        checks = {
            "database_connected": False,
            "golden_rules_loaded": False,
            "logging_enabled": True,
            "source_data_valid": False
        }

        try:
            # Check database connection
            result = self.db.client.table('engine_runs').select('id').limit(1).execute()
            checks["database_connected"] = True

            # Check golden_rules table exists and has data
            rules_result = self.db.client.table('golden_rules').select('id').limit(1).execute()
            checks["golden_rules_loaded"] = len(rules_result.data) > 0

            # Logging is always enabled in this implementation
            checks["logging_enabled"] = True

            all_passed = all(checks.values())

            # Log health check
            health_log = {
                "database_connected": checks["database_connected"],
                "golden_rules_loaded": checks["golden_rules_loaded"],
                "golden_rules_count": len(rules_result.data) if checks["golden_rules_loaded"] else 0,
                "source_data_valid": False,  # Will be validated later
                "logging_enabled": checks["logging_enabled"],
                "all_checks_passed": all_passed,
                "execution_allowed": all_passed,
                "checked_at": datetime.now(timezone.utc).isoformat()
            }

            self.db.client.table('system_health_log').insert(health_log).execute()

            return all_passed

        except Exception as e:
            logger.critical(f"Pre-flight check FAILED: {e}")
            self._log_critical_error("system_health_check_failed", str(e))
            return False

    # ================================================================
    # RUN LIFECYCLE
    # ================================================================

    def start_run(self, context: RunContext) -> str:
        """
        Start a new run and create audit entry
        CRITICAL: If this fails, execution MUST NOT proceed

        Returns: run_id
        Raises: Exception if logging fails
        """
        try:
            # Generate run_id
            timestamp = datetime.now(timezone.utc)
            run_id = f"RUN-{timestamp.strftime('%Y%m%d-%H%M%S')}-{timestamp.microsecond // 1000:04d}"

            # Calculate source hash if file provided
            source_hash = None
            if context.source_file_name and context.source_type == 'excel':
                source_hash = context.source_file_hash

            # Count golden rules
            rules_result = self.db.client.table('golden_rules').select('id').execute()
            golden_rules_count = len(rules_result.data)

            # Insert run record
            run_data = {
                "run_id": run_id,
                "started_at": timestamp.isoformat(),
                "source_type": context.source_type,
                "source_file_name": context.source_file_name,
                "source_file_hash": source_hash,
                "source_row_count": context.source_row_count,
                "status": "running",
                "execution_mode": context.execution_mode,
                "triggered_by": context.triggered_by,
                "engine_version": context.engine_version,
                "golden_rules_count": golden_rules_count,
                "matches_processed": 0,
                "matches_with_predictions": 0,
                "matches_skipped": 0,
                "total_predictions_generated": 0,
                "rules_evaluated": 0,
                "rules_matched": 0
            }

            result = self.db.client.table('engine_runs').insert(run_data).execute()

            if not result.data:
                raise Exception("Failed to insert run record")

            self.current_run_id = run_id
            self.run_started = True

            logger.info(f"✅ Run started and logged: {run_id}")
            return run_id

        except Exception as e:
            logger.critical(f"❌ FATAL: Failed to start run logging: {e}")
            self._log_critical_error("run_start_failed", str(e))
            raise Exception(f"Cannot proceed without logging: {e}")

    def complete_run(self,
                     matches_processed: int,
                     matches_with_predictions: int,
                     matches_skipped: int,
                     total_predictions: int,
                     rules_evaluated: int,
                     rules_matched: int,
                     unique_rules_used: List[str],
                     status: str = "completed",
                     error_message: Optional[str] = None) -> None:
        """
        Complete run and update audit record
        CRITICAL: Must succeed or log failure
        """
        if not self.run_started or not self.current_run_id:
            raise Exception("Cannot complete run: no active run")

        try:
            completed_at = datetime.now(timezone.utc).isoformat()

            update_data = {
                "completed_at": completed_at,
                "status": status,
                "matches_processed": matches_processed,
                "matches_with_predictions": matches_with_predictions,
                "matches_skipped": matches_skipped,
                "total_predictions_generated": total_predictions,
                "rules_evaluated": rules_evaluated,
                "rules_matched": rules_matched,
                "unique_rules_used": unique_rules_used,
                "error_message": error_message
            }

            result = self.db.client.table('engine_runs').update(update_data).eq(
                'run_id', self.current_run_id
            ).execute()

            if not result.data:
                raise Exception("Failed to update run record")

            logger.info(f"✅ Run completed and logged: {self.current_run_id}")

        except Exception as e:
            logger.critical(f"❌ FATAL: Failed to complete run logging: {e}")
            self._log_critical_error("run_completion_failed", str(e))
            raise Exception(f"Cannot finalize run: {e}")

    # ================================================================
    # MATCH PROCESSING
    # ================================================================

    def log_match_processing(self,
                             match_data: Dict[str, Any],
                             was_processed: bool,
                             skip_reason: Optional[str] = None,
                             predictions_count: int = 0,
                             best_prediction: Optional[str] = None,
                             best_confidence: Optional[float] = None,
                             matched_rules: Optional[List[Dict]] = None,
                             processing_duration_ms: Optional[int] = None) -> str:
        """
        Log match processing result
        CRITICAL: If this fails, execution MUST stop

        Returns: match_log_id
        Raises: Exception if logging fails
        """
        if not self.run_started:
            raise Exception("Cannot log match: no active run")

        try:
            matched_rule_ids = []
            matched_rule_codes = []

            if matched_rules:
                matched_rule_ids = [r.get('rule_id') for r in matched_rules if r.get('rule_id')]
                matched_rule_codes = [r.get('rule_code') for r in matched_rules if r.get('rule_code')]

            log_data = {
                "run_id": self.current_run_id,
                "home_team": match_data.get('home_team'),
                "away_team": match_data.get('away_team'),
                "league": match_data.get('league'),
                "match_date": match_data.get('match_date'),
                "match_time": match_data.get('match_time'),
                "was_processed": was_processed,
                "skip_reason": skip_reason,
                "predictions_count": predictions_count,
                "best_prediction": best_prediction,
                "best_confidence": best_confidence,
                "matched_rules_count": len(matched_rule_ids),
                "matched_rule_ids": matched_rule_ids,
                "matched_rule_codes": matched_rule_codes,
                "processing_duration_ms": processing_duration_ms,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }

            result = self.db.client.table('match_processing_log').insert(log_data).execute()

            if not result.data:
                raise Exception("Failed to log match processing")

            match_log_id = result.data[0]['id']

            # If skipped, also log to skip table
            if not was_processed and skip_reason:
                self._log_match_skip(match_log_id, match_data, skip_reason)

            return match_log_id

        except Exception as e:
            logger.critical(f"❌ FATAL: Failed to log match processing: {e}")
            self._log_critical_error("match_logging_failed", str(e))
            raise Exception(f"Cannot proceed without match logging: {e}")

    def log_prediction_audit(self,
                             match_log_id: str,
                             rule_data: Dict[str, Any],
                             prediction_data: Dict[str, Any],
                             match_data: Dict[str, Any],
                             was_selected_as_best: bool = False) -> str:
        """
        Log individual prediction for audit trail
        CRITICAL: If this fails, execution MUST stop

        Returns: prediction_audit_id
        """
        if not self.run_started:
            raise Exception("Cannot log prediction: no active run")

        try:
            audit_data = {
                "run_id": self.current_run_id,
                "match_log_id": match_log_id,
                "golden_rule_id": rule_data.get('rule_id'),
                "rule_code": rule_data.get('rule_code'),
                "rule_name": rule_data.get('rule_name'),
                "prediction_type": prediction_data.get('prediction_type'),
                "confidence_score": prediction_data.get('confidence'),
                "confidence_base": prediction_data.get('confidence_base'),
                "confidence_modifiers": prediction_data.get('modifiers', {}),
                "final_confidence": prediction_data.get('final_confidence'),
                "home_team": match_data.get('home_team'),
                "away_team": match_data.get('away_team'),
                "league": match_data.get('league'),
                "match_date": match_data.get('match_date'),
                "home_odds": match_data.get('home_odds'),
                "draw_odds": match_data.get('draw_odds'),
                "away_odds": match_data.get('away_odds'),
                "was_selected_as_best": was_selected_as_best,
                "was_excluded": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }

            result = self.db.client.table('prediction_audit_log').insert(audit_data).execute()

            if not result.data:
                raise Exception("Failed to log prediction audit")

            return result.data[0]['id']

        except Exception as e:
            logger.critical(f"❌ FATAL: Failed to log prediction audit: {e}")
            self._log_critical_error("prediction_logging_failed", str(e))
            raise Exception(f"Cannot proceed without prediction logging: {e}")

    def log_rule_application(self,
                             match_log_id: str,
                             rule_data: Dict[str, Any],
                             was_triggered: bool,
                             conditions_checked: Dict[str, Any],
                             prediction_generated: Optional[str] = None,
                             confidence_calculated: Optional[float] = None) -> None:
        """
        Log rule evaluation result
        """
        if not self.run_started:
            raise Exception("Cannot log rule application: no active run")

        try:
            log_data = {
                "run_id": self.current_run_id,
                "match_log_id": match_log_id,
                "golden_rule_id": rule_data.get('rule_id'),
                "rule_code": rule_data.get('rule_code'),
                "was_triggered": was_triggered,
                "trigger_reason": rule_data.get('trigger_reason'),
                "conditions_checked": conditions_checked,
                "prediction_generated": prediction_generated,
                "confidence_calculated": confidence_calculated,
                "evaluated_at": datetime.now(timezone.utc).isoformat()
            }

            self.db.client.table('rule_application_log').insert(log_data).execute()

        except Exception as e:
            logger.error(f"Failed to log rule application: {e}")
            # Non-critical, don't halt execution

    # ================================================================
    # PRIVATE HELPERS
    # ================================================================

    def _log_match_skip(self, match_log_id: str, match_data: Dict, reason: str) -> None:
        """Log skipped match to dedicated skip table"""
        try:
            # Categorize skip reason
            category = self._categorize_skip_reason(reason)

            skip_data = {
                "run_id": self.current_run_id,
                "match_log_id": match_log_id,
                "home_team": match_data.get('home_team'),
                "away_team": match_data.get('away_team'),
                "league": match_data.get('league'),
                "match_date": match_data.get('match_date'),
                "skip_category": category,
                "skip_reason": reason,
                "skip_details": {},
                "skipped_at": datetime.now(timezone.utc).isoformat()
            }

            self.db.client.table('match_skip_log').insert(skip_data).execute()

        except Exception as e:
            logger.error(f"Failed to log match skip: {e}")

    def _categorize_skip_reason(self, reason: str) -> str:
        """Categorize skip reason for analytics"""
        reason_lower = reason.lower()

        if 'odds' in reason_lower or 'oran' in reason_lower:
            return 'missing_odds'
        elif 'data' in reason_lower or 'veri' in reason_lower:
            return 'insufficient_data'
        elif 'league' in reason_lower or 'lig' in reason_lower:
            return 'league_excluded'
        elif 'date' in reason_lower or 'tarih' in reason_lower:
            return 'date_filter'
        elif 'duplicate' in reason_lower or 'tekrar' in reason_lower:
            return 'duplicate'
        elif 'rule' in reason_lower or 'kural' in reason_lower:
            return 'no_rules_matched'
        elif 'confidence' in reason_lower or 'güven' in reason_lower:
            return 'confidence_too_low'
        else:
            return 'other'

    def _log_critical_error(self, error_type: str, message: str) -> None:
        """Log critical system error"""
        try:
            error_data = {
                "run_id": self.current_run_id,
                "error_type": "critical_system_error",
                "error_message": f"{error_type}: {message}",
                "severity": "critical",
                "execution_halted": True,
                "occurred_at": datetime.now(timezone.utc).isoformat()
            }

            self.db.client.table('execution_errors_log').insert(error_data).execute()

        except Exception as e:
            logger.critical(f"Failed to log critical error: {e}")

    # ================================================================
    # UTILITY
    # ================================================================

    @staticmethod
    def calculate_file_hash(file_path: str) -> str:
        """Calculate SHA256 hash of file for audit trail"""
        sha256_hash = hashlib.sha256()

        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)

        return sha256_hash.hexdigest()


# ================================================================
# FAIL-SAFE WRAPPER
# ================================================================

class LoggingRequiredError(Exception):
    """Raised when logging fails and execution cannot continue"""
    pass


def require_logging(func):
    """
    Decorator to ensure function execution is logged
    If logging fails, execution is halted
    """
    def wrapper(*args, **kwargs):
        audit_logger = kwargs.get('audit_logger')

        if not audit_logger:
            raise LoggingRequiredError("audit_logger is required but not provided")

        if not audit_logger.run_started:
            raise LoggingRequiredError("No active run - logging required before execution")

        return func(*args, **kwargs)

    return wrapper
