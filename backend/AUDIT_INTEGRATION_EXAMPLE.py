"""
EXAMPLE: How to integrate audit logging into engine execution

This demonstrates the FAIL-SAFE pattern where execution cannot proceed without logging.
"""

from audit_logger import AuditLogger, RunContext, LoggingRequiredError
from db import get_client
import sys


def run_engine_with_audit():
    """
    Example of properly audited engine execution
    """

    # Initialize
    db = get_client()
    audit = AuditLogger(db)

    try:
        # ================================================================
        # STEP 1: PRE-FLIGHT CHECK (MANDATORY)
        # ================================================================
        print("🔍 Running pre-flight checks...")

        if not audit.pre_flight_check():
            print("❌ Pre-flight checks FAILED. Cannot proceed.")
            sys.exit(1)

        print("✅ Pre-flight checks passed")

        # ================================================================
        # STEP 2: START RUN (MANDATORY - IF THIS FAILS, STOP)
        # ================================================================
        print("\n📝 Starting run logging...")

        context = RunContext(
            run_id="",  # Will be generated
            source_type="excel",
            source_file_name="matches_2026_02_06.xlsx",
            source_file_hash=AuditLogger.calculate_file_hash("data/matches.xlsx"),
            source_row_count=150,
            execution_mode="production",
            triggered_by="cron",
            engine_version="1.0.0"
        )

        try:
            run_id = audit.start_run(context)
            print(f"✅ Run started: {run_id}")
        except Exception as e:
            print(f"❌ FATAL: Cannot start run logging: {e}")
            sys.exit(1)

        # ================================================================
        # STEP 3: PROCESS MATCHES (WITH LOGGING)
        # ================================================================
        print("\n⚙️  Processing matches...")

        matches_processed = 0
        matches_with_predictions = 0
        matches_skipped = 0
        total_predictions = 0
        rules_evaluated = 0
        rules_matched = 0
        unique_rules_used = set()

        # Example matches (in real code, load from Excel)
        example_matches = [
            {
                "home_team": "Real Madrid",
                "away_team": "Barcelona",
                "league": "LaLiga",
                "match_date": "2026-02-07",
                "match_time": "20:00",
                "home_odds": 2.10,
                "draw_odds": 3.40,
                "away_odds": 3.20
            },
            {
                "home_team": "PSG",
                "away_team": "Lyon",
                "league": "Ligue 1",
                "match_date": "2026-02-07",
                "match_time": "21:00",
                # Missing odds - should be skipped
            }
        ]

        for match in example_matches:
            matches_processed += 1

            # Check if match should be processed
            if not match.get('home_odds'):
                # SKIP - but MUST be logged
                try:
                    audit.log_match_processing(
                        match_data=match,
                        was_processed=False,
                        skip_reason="Missing odds data"
                    )
                    matches_skipped += 1
                    print(f"  ⏭️  Skipped: {match['home_team']} vs {match['away_team']}")
                except Exception as e:
                    print(f"❌ FATAL: Cannot log skipped match: {e}")
                    sys.exit(1)
                continue

            # Process match - evaluate rules
            matched_rules = [
                {"rule_id": 1, "rule_code": "MS_YUKSEK_ORAN", "rule_name": "MS 2.5 Üst Yüksek Oran"},
                {"rule_id": 5, "rule_code": "IY_YUKSEK_ORAN", "rule_name": "İY 0.5 Üst Yüksek Oran"}
            ]

            rules_evaluated += len(matched_rules)
            rules_matched += len(matched_rules)

            for rule in matched_rules:
                unique_rules_used.add(rule['rule_code'])

            # Generate predictions
            predictions = [
                {
                    "prediction_type": "MS 2.5 ÜST",
                    "confidence": 85.5,
                    "confidence_base": 82.0,
                    "modifiers": {"odds_boost": 3.5},
                    "final_confidence": 85.5
                },
                {
                    "prediction_type": "İY 0.5 ÜST",
                    "confidence": 78.2,
                    "confidence_base": 75.0,
                    "modifiers": {"odds_boost": 3.2},
                    "final_confidence": 78.2
                }
            ]

            total_predictions += len(predictions)

            # LOG MATCH PROCESSING (CRITICAL)
            try:
                match_log_id = audit.log_match_processing(
                    match_data=match,
                    was_processed=True,
                    predictions_count=len(predictions),
                    best_prediction=predictions[0]['prediction_type'],
                    best_confidence=predictions[0]['confidence'],
                    matched_rules=matched_rules,
                    processing_duration_ms=45
                )

                matches_with_predictions += 1
                print(f"  ✅ Processed: {match['home_team']} vs {match['away_team']}")

            except Exception as e:
                print(f"❌ FATAL: Cannot log match processing: {e}")
                sys.exit(1)

            # LOG EACH PREDICTION (CRITICAL)
            for i, pred in enumerate(predictions):
                try:
                    audit.log_prediction_audit(
                        match_log_id=match_log_id,
                        rule_data=matched_rules[i % len(matched_rules)],
                        prediction_data=pred,
                        match_data=match,
                        was_selected_as_best=(i == 0)
                    )
                except Exception as e:
                    print(f"❌ FATAL: Cannot log prediction: {e}")
                    sys.exit(1)

        # ================================================================
        # STEP 4: COMPLETE RUN (MANDATORY)
        # ================================================================
        print("\n✅ Completing run logging...")

        try:
            audit.complete_run(
                matches_processed=matches_processed,
                matches_with_predictions=matches_with_predictions,
                matches_skipped=matches_skipped,
                total_predictions=total_predictions,
                rules_evaluated=rules_evaluated,
                rules_matched=rules_matched,
                unique_rules_used=list(unique_rules_used),
                status="completed"
            )
            print(f"✅ Run completed successfully: {run_id}")

        except Exception as e:
            print(f"❌ FATAL: Cannot complete run logging: {e}")
            sys.exit(1)

        # ================================================================
        # SUMMARY
        # ================================================================
        print("\n" + "="*60)
        print("RUN SUMMARY")
        print("="*60)
        print(f"Run ID: {run_id}")
        print(f"Matches Processed: {matches_processed}")
        print(f"Matches with Predictions: {matches_with_predictions}")
        print(f"Matches Skipped: {matches_skipped}")
        print(f"Total Predictions: {total_predictions}")
        print(f"Rules Evaluated: {rules_evaluated}")
        print(f"Rules Matched: {rules_matched}")
        print(f"Unique Rules Used: {len(unique_rules_used)}")
        print("="*60)

    except Exception as e:
        print(f"\n❌ EXECUTION FAILED: {e}")

        # Try to log failure
        if audit.run_started:
            try:
                audit.complete_run(
                    matches_processed=matches_processed,
                    matches_with_predictions=matches_with_predictions,
                    matches_skipped=matches_skipped,
                    total_predictions=total_predictions,
                    rules_evaluated=rules_evaluated,
                    rules_matched=rules_matched,
                    unique_rules_used=list(unique_rules_used),
                    status="failed",
                    error_message=str(e)
                )
            except:
                pass

        sys.exit(1)


if __name__ == "__main__":
    run_engine_with_audit()
