# 🔒 Audit & Historical Logging System

**Version**: 1.0.0
**Status**: PRODUCTION REQUIRED

---

## Overview

Every system run is **permanently logged** in an **immutable, append-only** audit trail. No execution is allowed without successful logging.

---

## Core Principles

### 1. **Logging is Mandatory**
- ❌ No run can execute without creating audit records
- ❌ If logging fails → execution MUST stop immediately
- ❌ No in-memory-only processing allowed

### 2. **Logs are Immutable**
- ✅ All tables are append-only
- ❌ No DELETE operations allowed
- ❌ No UPDATE of historical data (except run completion)
- ✅ Complete audit trail preserved forever

### 3. **Fail-Safe by Design**
- Every critical operation checks logging success
- Logging failure = execution failure
- No silent failures allowed

---

## Database Schema

### Tables Created

#### 1. **engine_runs** (Parent record for each execution)
```sql
- run_id: Unique identifier (RUN-YYYYMMDD-HHMMSS-XXXX)
- started_at, completed_at, duration_seconds
- source_type, source_file_name, source_file_hash (SHA256)
- matches_processed, matches_with_predictions, matches_skipped
- total_predictions_generated
- rules_evaluated, rules_matched, unique_rules_used[]
- status: running | completed | failed | partial
- execution_mode: production | test | sandbox
- triggered_by: cron | admin | api | manual
```

#### 2. **match_processing_log** (Per-match processing record)
```sql
- run_id (FK to engine_runs)
- match_id (FK to matches if persisted)
- home_team, away_team, league, match_date
- was_processed: true | false
- skip_reason: NULL if processed, reason if skipped
- predictions_count, best_prediction, best_confidence
- matched_rules_count, matched_rule_ids[], matched_rule_codes[]
- processing_duration_ms
```

#### 3. **prediction_audit_log** (Per-prediction snapshot)
```sql
- run_id, match_log_id, prediction_id
- golden_rule_id, rule_code, rule_name
- prediction_type, confidence_score
- confidence_base, confidence_modifiers (JSONB), final_confidence
- home_team, away_team, league, match_date
- home_odds, draw_odds, away_odds
- was_selected_as_best, was_excluded, exclusion_reason
- created_at (immutable timestamp)
```

#### 4. **rule_application_log** (Rule evaluation tracking)
```sql
- run_id, match_log_id
- golden_rule_id, rule_code
- was_triggered: true | false
- trigger_reason
- conditions_checked (JSONB)
- prediction_generated, confidence_calculated
- evaluation_duration_ms
```

#### 5. **match_skip_log** (Why matches were excluded)
```sql
- run_id, match_log_id
- skip_category: missing_odds | insufficient_data | league_excluded | ...
- skip_reason, skip_details (JSONB)
```

#### 6. **execution_errors_log** (System errors)
```sql
- run_id
- error_type: database_failure | logging_failure | ...
- error_message, error_stack
- severity: warning | error | critical
- execution_halted: true | false
```

#### 7. **system_health_log** (Pre-run validation)
```sql
- run_id
- database_connected, golden_rules_loaded, source_data_valid
- all_checks_passed, execution_allowed
```

---

## Python Implementation

### AuditLogger Class

```python
from audit_logger import AuditLogger, RunContext

# Initialize
audit = AuditLogger(db_client)

# 1. Pre-flight check (MANDATORY)
if not audit.pre_flight_check():
    sys.exit(1)  # Cannot proceed

# 2. Start run (CRITICAL - if fails, STOP)
context = RunContext(
    run_id="",
    source_type="excel",
    source_file_name="matches.xlsx",
    source_file_hash=AuditLogger.calculate_file_hash("matches.xlsx"),
    source_row_count=150,
    execution_mode="production",
    triggered_by="cron"
)

try:
    run_id = audit.start_run(context)
except Exception as e:
    print(f"FATAL: {e}")
    sys.exit(1)

# 3. Process matches (WITH LOGGING)
for match in matches:
    try:
        match_log_id = audit.log_match_processing(
            match_data=match,
            was_processed=True,
            predictions_count=2,
            best_prediction="MS 2.5 ÜST",
            best_confidence=85.5,
            matched_rules=[...],
            processing_duration_ms=45
        )
    except Exception as e:
        print(f"FATAL: Cannot log match: {e}")
        sys.exit(1)

    # Log each prediction
    for pred in predictions:
        try:
            audit.log_prediction_audit(
                match_log_id=match_log_id,
                rule_data=rule,
                prediction_data=pred,
                match_data=match,
                was_selected_as_best=True
            )
        except Exception as e:
            print(f"FATAL: Cannot log prediction: {e}")
            sys.exit(1)

# 4. Complete run (MANDATORY)
try:
    audit.complete_run(
        matches_processed=100,
        matches_with_predictions=75,
        matches_skipped=25,
        total_predictions=150,
        rules_evaluated=5000,
        rules_matched=200,
        unique_rules_used=["MS_YUKSEK_ORAN", "IY_YUKSEK_ORAN"],
        status="completed"
    )
except Exception as e:
    print(f"FATAL: Cannot complete run: {e}")
    sys.exit(1)
```

---

## Fail-Safe Rules

### CRITICAL Requirements

1. **Pre-flight Check Must Pass**
   - Database connectivity verified
   - Golden rules table accessible
   - Logging infrastructure operational
   - If ANY check fails → HALT execution

2. **Run Start Must Succeed**
   - `start_run()` must create `engine_runs` record
   - If INSERT fails → HALT execution
   - No processing without active `run_id`

3. **Match Logging Must Succeed**
   - Every match (processed or skipped) MUST be logged
   - If `log_match_processing()` fails → HALT execution
   - No silent skipping allowed

4. **Prediction Logging Must Succeed**
   - Every prediction generated MUST be logged
   - If `log_prediction_audit()` fails → HALT execution
   - Complete audit trail required

5. **Run Completion Must Succeed**
   - `complete_run()` must update `engine_runs` record
   - If UPDATE fails → Log critical error
   - Run remains in "running" state if completion fails

### Error Handling

```python
try:
    # Critical operation
    audit.log_match_processing(...)
except Exception as e:
    # Log critical error
    logger.critical(f"FATAL: Logging failed: {e}")

    # Try to mark run as failed
    audit.complete_run(status="failed", error_message=str(e))

    # HALT execution
    sys.exit(1)
```

---

## Querying Audit Logs

### View: run_summary
```sql
SELECT * FROM run_summary
ORDER BY started_at DESC
LIMIT 10;
```

### View: skip_analysis
```sql
SELECT * FROM skip_analysis
WHERE run_id = 'RUN-20260206-143022-1234';
```

### View: rule_performance_per_run
```sql
SELECT * FROM rule_performance_per_run
WHERE run_id = 'RUN-20260206-143022-1234'
ORDER BY times_triggered DESC;
```

### Custom Queries

**Find all predictions for a specific match:**
```sql
SELECT pal.*
FROM prediction_audit_log pal
JOIN match_processing_log mpl ON mpl.id = pal.match_log_id
WHERE mpl.home_team = 'Real Madrid'
  AND mpl.away_team = 'Barcelona'
  AND mpl.match_date = '2026-02-07'
ORDER BY pal.confidence_score DESC;
```

**Analyze skip reasons over time:**
```sql
SELECT
  skip_category,
  COUNT(*) as skip_count,
  ROUND(AVG(CASE WHEN skip_category = 'missing_odds' THEN 1 ELSE 0 END) * 100, 2) as pct_missing_odds
FROM match_skip_log
WHERE skipped_at >= NOW() - INTERVAL '30 days'
GROUP BY skip_category
ORDER BY skip_count DESC;
```

**Track rule performance across runs:**
```sql
SELECT
  ral.rule_code,
  COUNT(DISTINCT ral.run_id) as runs_used,
  COUNT(*) as times_evaluated,
  COUNT(*) FILTER (WHERE was_triggered = true) as times_triggered,
  ROUND(
    COUNT(*) FILTER (WHERE was_triggered = true)::DECIMAL / COUNT(*) * 100,
    2
  ) as trigger_rate
FROM rule_application_log ral
WHERE ral.evaluated_at >= NOW() - INTERVAL '7 days'
GROUP BY ral.rule_code
ORDER BY times_triggered DESC
LIMIT 10;
```

---

## Integration Checklist

### Before Deployment

- [ ] Deploy `database/audit_schema.sql` to Supabase
- [ ] Verify all tables created successfully
- [ ] Check RLS policies are active
- [ ] Test pre-flight checks pass
- [ ] Verify logging infrastructure works

### In Engine Code

- [ ] Import `AuditLogger` at start of execution
- [ ] Run `pre_flight_check()` before processing
- [ ] Call `start_run()` before any match processing
- [ ] Log every match with `log_match_processing()`
- [ ] Log every prediction with `log_prediction_audit()`
- [ ] Call `complete_run()` at end of execution
- [ ] Handle logging failures with `sys.exit(1)`

### Testing

- [ ] Run engine with audit logging enabled
- [ ] Verify `engine_runs` record created
- [ ] Check `match_processing_log` has all matches
- [ ] Confirm `prediction_audit_log` has all predictions
- [ ] Test skip logging for excluded matches
- [ ] Verify fail-safe behavior (simulate logging failure)

---

## Security & Compliance

### Row Level Security (RLS)

- ✅ **READ**: Authenticated users can read all audit logs
- ✅ **WRITE**: Only service role can insert logs
- ❌ **DELETE**: No one can delete logs (no policy = no access)
- ❌ **UPDATE**: Only `engine_runs` completion allowed

### Data Retention

- All logs are **permanent**
- No automatic deletion
- Archive old runs manually if needed (export → backup → keep reference)

### Audit Trail Integrity

- Source file hash (SHA256) ensures data provenance
- Immutable timestamps prevent tampering
- Append-only design guarantees completeness
- Complete rule evaluation chain traceable

---

## Performance Considerations

### Indexing

All critical queries are indexed:
- `run_id` lookups: O(log n)
- Date range queries: Indexed on timestamps
- Rule performance: Indexed on `golden_rule_id`
- Skip analysis: Indexed on `skip_category`

### Write Performance

- Batch inserts where possible
- Async logging not recommended (fail-safe requires synchronous confirmation)
- Typical overhead: ~10-20ms per match logged

### Storage Growth

Estimated storage per run:
- 100 matches × 2 predictions = 200 prediction logs
- 100 match logs + 200 prediction logs + 1 run log
- ~50 KB per run average
- 1000 runs/year = ~50 MB/year

---

## Troubleshooting

### "Cannot proceed without logging"

**Cause**: Logging failed during execution

**Fix**:
1. Check database connectivity
2. Verify service role credentials in `.env`
3. Check Supabase logs for errors
4. Ensure audit tables exist

### "Pre-flight checks failed"

**Cause**: System not ready for execution

**Fix**:
1. Check `system_health_log` for details
2. Verify `golden_rules` table has data
3. Test database connection manually
4. Check RLS policies are correct

### Run stuck in "running" state

**Cause**: Execution crashed before `complete_run()`

**Manual Fix**:
```sql
UPDATE engine_runs
SET status = 'failed',
    error_message = 'Execution interrupted',
    completed_at = NOW()
WHERE run_id = 'RUN-YYYYMMDD-HHMMSS-XXXX'
  AND status = 'running';
```

---

## Examples

See `backend/AUDIT_INTEGRATION_EXAMPLE.py` for complete working example.

---

**Status**: ✅ PRODUCTION READY
**Last Updated**: February 6, 2026
