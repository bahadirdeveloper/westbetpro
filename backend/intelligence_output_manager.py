"""
Intelligence Output Manager
UI-First, Human-in-the-Loop Output System

GLOBAL RULE: No backend output without UI destination
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class OutputType(Enum):
    """Types of intelligence outputs"""
    SUGGESTION = "suggestion"
    ALARM = "alarm"
    DEGRADATION_WARNING = "degradation_warning"
    INSIGHT = "insight"
    RULE_CANDIDATE = "rule_candidate"
    CONFIDENCE_DRIFT = "confidence_drift"
    ANOMALY = "anomaly"
    SYSTEM_EVENT = "system_event"


class UICategory(Enum):
    """UI categories (WHERE it appears in admin panel)"""
    SUGGESTIONS = "Suggestions"
    ALARMS = "Alarms"
    RULE_HEALTH = "Rule Health"
    SANDBOX_RESULTS = "Sandbox Results"
    SYSTEM_LOGS = "System Logs"


class UIPriority(Enum):
    """UI priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RequiredAction(Enum):
    """What admin must do"""
    VIEW = "view"
    REVIEW = "review"
    APPROVE = "approve"
    REJECT = "reject"
    ARCHIVE = "archive"


class OutputStatus(Enum):
    """Lifecycle states"""
    NEW = "new"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"
    EXECUTED = "executed"


class BlockReason(Enum):
    """Why output was blocked"""
    MISSING_UI_MAPPING = "missing_ui_mapping"
    PERSISTENCE_FAILED = "persistence_failed"
    ADMIN_APPROVAL_ABSENT = "admin_approval_absent"
    INVALID_LIFECYCLE_STATE = "invalid_lifecycle_state"
    SOURCE_UNKNOWN = "source_unknown"
    PAYLOAD_INVALID = "payload_invalid"


@dataclass
class IntelligenceOutput:
    """
    Intelligence output structure
    MANDATORY FIELDS - Cannot be None
    """
    # Identification
    output_type: OutputType
    source_phase: str
    source_component: Optional[str]

    # UI MAPPING (NON-NEGOTIABLE)
    ui_category: UICategory
    ui_priority: UIPriority
    required_admin_action: RequiredAction

    # Content
    title: str
    description: str
    payload: Dict[str, Any]

    # Advisory language (never commanding)
    advisory_text: Optional[str] = None

    # Traceability
    related_run_id: Optional[str] = None
    related_rule_id: Optional[int] = None
    related_test_id: Optional[str] = None


class IntelligenceOutputManager:
    """
    Manages all system intelligence outputs
    Enforces UI-First principle
    """

    def __init__(self, db_client):
        self.db = db_client

    # ================================================================
    # OUTPUT EMISSION (WITH FAILSAFE)
    # ================================================================

    def emit_output(self, output: IntelligenceOutput) -> Optional[str]:
        """
        Emit intelligence output with failsafe checks

        Returns: output_id if successful, None if blocked
        Raises: Exception if critical validation fails
        """
        try:
            # STEP 1: Validate UI mapping (NON-NEGOTIABLE)
            self._validate_ui_mapping(output)

            # STEP 2: Validate payload structure
            self._validate_payload(output)

            # STEP 3: Generate output_id
            output_id = self._generate_output_id()

            # STEP 4: Persist to database (MUST SUCCEED)
            try:
                self._persist_output(output_id, output)
            except Exception as e:
                # CRITICAL: Persistence failed → Block and log
                self._log_blocked_event(
                    blocked_operation=f"emit_{output.output_type.value}",
                    block_reason=BlockReason.PERSISTENCE_FAILED,
                    attempted_payload=output.payload,
                    error_message=str(e),
                    system_phase=output.source_phase,
                    component_name=output.source_component
                )
                logger.critical(f"❌ BLOCKED: Persistence failed for {output.output_type.value}")
                return None

            # STEP 5: Success - output is now visible in UI
            logger.info(f"✅ Emitted {output.output_type.value}: {output_id} → {output.ui_category.value}")
            return output_id

        except ValidationError as e:
            # Validation failed → Block and log
            self._log_blocked_event(
                blocked_operation=f"emit_{output.output_type.value}",
                block_reason=BlockReason.MISSING_UI_MAPPING,
                attempted_payload=output.payload if hasattr(output, 'payload') else {},
                error_message=str(e),
                system_phase=getattr(output, 'source_phase', 'unknown'),
                component_name=getattr(output, 'source_component', None)
            )
            logger.error(f"❌ BLOCKED: {e}")
            return None

        except Exception as e:
            logger.critical(f"❌ Unexpected error in emit_output: {e}")
            return None

    # ================================================================
    # VALIDATION
    # ================================================================

    def _validate_ui_mapping(self, output: IntelligenceOutput) -> None:
        """
        Validate that UI mapping is complete
        Raises ValidationError if missing
        """
        if not isinstance(output.ui_category, UICategory):
            raise ValidationError(
                f"ui_category must be UICategory enum, got {type(output.ui_category)}"
            )

        if not isinstance(output.ui_priority, UIPriority):
            raise ValidationError(
                f"ui_priority must be UIPriority enum, got {type(output.ui_priority)}"
            )

        if not isinstance(output.required_admin_action, RequiredAction):
            raise ValidationError(
                f"required_admin_action must be RequiredAction enum, got {type(output.required_admin_action)}"
            )

        if not output.title or not output.description:
            raise ValidationError("title and description are required")

    def _validate_payload(self, output: IntelligenceOutput) -> None:
        """Validate payload structure"""
        if not isinstance(output.payload, dict):
            raise ValidationError("payload must be a dictionary")

        # Check for required payload fields based on output type
        if output.output_type == OutputType.SUGGESTION:
            required_fields = ['recommendation', 'justification']
        elif output.output_type == OutputType.ALARM:
            required_fields = ['severity', 'issue']
        elif output.output_type == OutputType.DEGRADATION_WARNING:
            required_fields = ['current_performance', 'baseline_performance', 'delta']
        else:
            required_fields = []

        for field in required_fields:
            if field not in output.payload:
                raise ValidationError(f"payload missing required field: {field}")

    # ================================================================
    # PERSISTENCE
    # ================================================================

    def _persist_output(self, output_id: str, output: IntelligenceOutput) -> None:
        """
        Persist output to database
        CRITICAL: This MUST succeed
        """
        data = {
            "output_id": output_id,
            "output_type": output.output_type.value,
            "source_phase": output.source_phase,
            "source_component": output.source_component,
            "ui_category": output.ui_category.value,
            "ui_priority": output.ui_priority.value,
            "required_admin_action": output.required_admin_action.value,
            "title": output.title,
            "description": output.description,
            "payload": output.payload,
            "advisory_text": output.advisory_text,
            "status": OutputStatus.NEW.value,
            "related_run_id": output.related_run_id,
            "related_rule_id": output.related_rule_id,
            "related_test_id": output.related_test_id,
            "is_dismissed": False,
            "is_pinned": False
        }

        result = self.db.client.table('intelligence_outputs').insert(data).execute()

        if not result.data:
            raise Exception("Database insert failed")

    def _log_blocked_event(self,
                           blocked_operation: str,
                           block_reason: BlockReason,
                           attempted_payload: Dict,
                           error_message: str,
                           system_phase: str,
                           component_name: Optional[str]) -> None:
        """Log blocked operation (visible in admin UI)"""
        try:
            event_id = f"BLOCK-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

            data = {
                "event_id": event_id,
                "blocked_operation": blocked_operation,
                "block_reason": block_reason.value,
                "attempted_payload": attempted_payload,
                "error_message": error_message,
                "system_phase": system_phase,
                "component_name": component_name,
                "resolved": False
            }

            self.db.client.table('system_blocked_events').insert(data).execute()

        except Exception as e:
            logger.critical(f"Failed to log blocked event: {e}")

    def _generate_output_id(self) -> str:
        """Generate unique output ID"""
        timestamp = datetime.now(timezone.utc)
        return f"OUT-{timestamp.strftime('%Y%m%d-%H%M%S')}-{timestamp.microsecond // 1000:03d}"

    # ================================================================
    # ADMIN ACTIONS
    # ================================================================

    def update_output_status(self,
                             output_id: str,
                             new_status: OutputStatus,
                             admin_email: str,
                             admin_notes: Optional[str] = None,
                             approval_details: Optional[Dict] = None) -> bool:
        """
        Admin updates output status
        Enforces lifecycle state machine
        """
        try:
            # Validate status transition
            current_status = self._get_current_status(output_id)
            if not self._is_valid_transition(current_status, new_status):
                logger.error(f"Invalid status transition: {current_status} → {new_status}")
                return False

            # Update output
            update_data = {
                "status": new_status.value,
                "reviewed_by": admin_email,
                "reviewed_at": datetime.now(timezone.utc).isoformat()
            }

            if admin_notes:
                update_data["admin_notes"] = admin_notes

            if approval_details:
                update_data["approval_details"] = approval_details

            result = self.db.client.table('intelligence_outputs').update(
                update_data
            ).eq('output_id', output_id).execute()

            if result.data:
                logger.info(f"✅ Updated {output_id} → {new_status.value}")
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to update output status: {e}")
            return False

    def _get_current_status(self, output_id: str) -> Optional[OutputStatus]:
        """Get current status of output"""
        result = self.db.client.table('intelligence_outputs').select(
            'status'
        ).eq('output_id', output_id).execute()

        if result.data:
            return OutputStatus(result.data[0]['status'])

        return None

    def _is_valid_transition(self, current: OutputStatus, new: OutputStatus) -> bool:
        """
        Validate status transition according to state machine

        Valid transitions:
        NEW → REVIEWED
        REVIEWED → APPROVED | REJECTED | ARCHIVED
        APPROVED → EXECUTED
        """
        valid_transitions = {
            OutputStatus.NEW: [OutputStatus.REVIEWED],
            OutputStatus.REVIEWED: [OutputStatus.APPROVED, OutputStatus.REJECTED, OutputStatus.ARCHIVED],
            OutputStatus.APPROVED: [OutputStatus.EXECUTED, OutputStatus.ARCHIVED],
            OutputStatus.REJECTED: [OutputStatus.ARCHIVED],
            OutputStatus.ARCHIVED: [],
            OutputStatus.EXECUTED: [OutputStatus.ARCHIVED]
        }

        return new in valid_transitions.get(current, [])

    # ================================================================
    # QUERY HELPERS
    # ================================================================

    def get_pending_items(self, admin_email: str) -> List[Dict]:
        """Get items awaiting admin attention"""
        result = self.db.client.table('intelligence_outputs').select(
            '*'
        ).eq('status', OutputStatus.NEW.value).eq(
            'is_dismissed', False
        ).order('ui_priority', desc=True).order('created_at').execute()

        return result.data

    def get_critical_alarms(self) -> List[Dict]:
        """Get critical alarms"""
        result = self.db.client.table('intelligence_outputs').select(
            '*'
        ).eq('ui_priority', UIPriority.CRITICAL.value).eq(
            'status', OutputStatus.NEW.value
        ).execute()

        return result.data

    def get_blocked_events(self) -> List[Dict]:
        """Get unresolved blocked events"""
        result = self.db.client.table('system_blocked_events').select(
            '*'
        ).eq('resolved', False).order('blocked_at', desc=True).execute()

        return result.data


# ================================================================
# EXCEPTIONS
# ================================================================

class ValidationError(Exception):
    """Raised when validation fails"""
    pass


# ================================================================
# HELPER: Create outputs easily
# ================================================================

def create_suggestion_output(
    title: str,
    description: str,
    recommendation: str,
    justification: str,
    source_phase: str,
    priority: UIPriority = UIPriority.MEDIUM,
    **kwargs
) -> IntelligenceOutput:
    """Helper to create suggestion output"""
    return IntelligenceOutput(
        output_type=OutputType.SUGGESTION,
        source_phase=source_phase,
        source_component=kwargs.get('source_component'),
        ui_category=UICategory.SUGGESTIONS,
        ui_priority=priority,
        required_admin_action=RequiredAction.REVIEW,
        title=title,
        description=description,
        payload={
            "recommendation": recommendation,
            "justification": justification,
            **kwargs.get('extra_payload', {})
        },
        advisory_text=f"Observed pattern suggests: {recommendation}",
        related_run_id=kwargs.get('related_run_id'),
        related_rule_id=kwargs.get('related_rule_id')
    )


def create_alarm_output(
    title: str,
    description: str,
    severity: str,
    issue: str,
    source_phase: str,
    **kwargs
) -> IntelligenceOutput:
    """Helper to create alarm output"""
    return IntelligenceOutput(
        output_type=OutputType.ALARM,
        source_phase=source_phase,
        source_component=kwargs.get('source_component'),
        ui_category=UICategory.ALARMS,
        ui_priority=UIPriority.CRITICAL,
        required_admin_action=RequiredAction.REVIEW,
        title=title,
        description=description,
        payload={
            "severity": severity,
            "issue": issue,
            **kwargs.get('extra_payload', {})
        },
        advisory_text=f"Critical issue detected: {issue}",
        related_run_id=kwargs.get('related_run_id'),
        related_rule_id=kwargs.get('related_rule_id')
    )


# ================================================================
# CLI EXAMPLE
# ================================================================

if __name__ == "__main__":
    """
    Example usage
    """
    import sys
    sys.path.append('.')
    from db import get_client

    logging.basicConfig(level=logging.INFO)

    db = get_client()
    manager = IntelligenceOutputManager(db)

    # Example: Emit a suggestion
    suggestion = create_suggestion_output(
        title="Rule #42 Degradation Detected",
        description="Rule #42 has dropped to 74% success rate (baseline: 82%)",
        recommendation="Consider reducing confidence_base by 5-8 points",
        justification="8% drop is statistically significant (p < 0.05) over 60 predictions",
        source_phase="Learning Engine",
        source_component="rule_degradation_detector",
        priority=UIPriority.HIGH,
        related_rule_id=42,
        extra_payload={
            "current_win_rate": 74.0,
            "baseline_win_rate": 82.0,
            "delta": -8.0,
            "sample_size": 60,
            "p_value": 0.0234
        }
    )

    output_id = manager.emit_output(suggestion)

    if output_id:
        print(f"✅ Output emitted successfully: {output_id}")
        print(f"   Category: {suggestion.ui_category.value}")
        print(f"   Priority: {suggestion.ui_priority.value}")
        print(f"   Action Required: {suggestion.required_admin_action.value}")
    else:
        print("❌ Output was blocked (check system_blocked_events table)")
