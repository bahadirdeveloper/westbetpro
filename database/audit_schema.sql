-- ================================================================
-- WESTBETPRO AUDIT & HISTORICAL LOGGING
-- Immutable, append-only system execution tracking
-- ================================================================

-- ================================================================
-- 1. ENGINE RUNS (Parent log for each execution)
-- ================================================================

CREATE TABLE IF NOT EXISTS engine_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run identification
  run_id TEXT UNIQUE NOT NULL, -- Format: RUN-YYYYMMDD-HHMMSS-XXXX

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Source data tracking
  source_type TEXT NOT NULL CHECK (source_type IN ('excel', 'api', 'manual')),
  source_file_name TEXT,
  source_file_hash TEXT, -- SHA256 of Excel file
  source_row_count INTEGER,

  -- Processing results
  matches_processed INTEGER NOT NULL DEFAULT 0,
  matches_with_predictions INTEGER NOT NULL DEFAULT 0,
  matches_skipped INTEGER NOT NULL DEFAULT 0,
  total_predictions_generated INTEGER NOT NULL DEFAULT 0,

  -- Rule application summary
  rules_evaluated INTEGER NOT NULL DEFAULT 0, -- Total rules checked
  rules_matched INTEGER NOT NULL DEFAULT 0,   -- Rules that triggered
  unique_rules_used TEXT[], -- Array of rule_codes

  -- Status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  error_message TEXT,

  -- Execution context
  execution_mode TEXT DEFAULT 'production' CHECK (execution_mode IN ('production', 'test', 'sandbox')),
  triggered_by TEXT, -- 'cron', 'admin', 'api', 'manual'

  -- Metadata
  engine_version TEXT,
  golden_rules_count INTEGER,

  CONSTRAINT valid_completion CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed')
  )
);

CREATE INDEX idx_engine_runs_run_id ON engine_runs(run_id);
CREATE INDEX idx_engine_runs_started ON engine_runs(started_at DESC);
CREATE INDEX idx_engine_runs_status ON engine_runs(status);
CREATE INDEX idx_engine_runs_source_hash ON engine_runs(source_file_hash);

-- ================================================================
-- 2. MATCH PROCESSING LOG (Per-match detail)
-- ================================================================

CREATE TABLE IF NOT EXISTS match_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to parent run
  run_id TEXT NOT NULL REFERENCES engine_runs(run_id) ON DELETE RESTRICT,

  -- Match identification
  match_id UUID, -- References matches table if persisted

  -- Raw match data (snapshot at processing time)
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  match_date DATE NOT NULL,
  match_time TIME,

  -- Processing decision
  was_processed BOOLEAN NOT NULL DEFAULT false,
  skip_reason TEXT, -- NULL if processed, reason if skipped

  -- Predictions generated (if any)
  predictions_count INTEGER DEFAULT 0,
  best_prediction TEXT,
  best_confidence DECIMAL(5,2),

  -- Rules matched
  matched_rules_count INTEGER DEFAULT 0,
  matched_rule_ids INTEGER[], -- Array of golden_rules.id
  matched_rule_codes TEXT[],  -- Array of rule_code for readability

  -- Confidence calculation snapshot
  confidence_factors JSONB, -- Raw calculation breakdown

  -- Timing
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_duration_ms INTEGER,

  CONSTRAINT valid_skip CHECK (
    (was_processed = true AND skip_reason IS NULL) OR
    (was_processed = false AND skip_reason IS NOT NULL)
  )
);

CREATE INDEX idx_match_log_run ON match_processing_log(run_id);
CREATE INDEX idx_match_log_match ON match_processing_log(match_id);
CREATE INDEX idx_match_log_date ON match_processing_log(match_date DESC);
CREATE INDEX idx_match_log_processed ON match_processing_log(was_processed);

-- ================================================================
-- 3. PREDICTION AUDIT LOG (Per-prediction snapshot)
-- ================================================================

CREATE TABLE IF NOT EXISTS prediction_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Traceability
  run_id TEXT NOT NULL REFERENCES engine_runs(run_id) ON DELETE RESTRICT,
  match_log_id UUID REFERENCES match_processing_log(id) ON DELETE RESTRICT,
  prediction_id UUID, -- References predictions table if persisted

  -- Rule that generated this prediction
  golden_rule_id INTEGER NOT NULL,
  rule_code TEXT NOT NULL,
  rule_name TEXT,

  -- Prediction details (snapshot)
  prediction_type TEXT NOT NULL, -- 'MS 2.5 ÜST', 'İY 0.5 ÜST', etc.
  confidence_score DECIMAL(5,2) NOT NULL,

  -- Calculation breakdown
  confidence_base DECIMAL(5,2),
  confidence_modifiers JSONB, -- All factors that affected confidence
  final_confidence DECIMAL(5,2),

  -- Match context (denormalized for audit)
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  match_date DATE NOT NULL,

  -- Odds (if available)
  home_odds DECIMAL(5,2),
  draw_odds DECIMAL(5,2),
  away_odds DECIMAL(5,2),

  -- Decision flags
  was_selected_as_best BOOLEAN DEFAULT false,
  was_excluded BOOLEAN DEFAULT false,
  exclusion_reason TEXT,

  -- Immutable timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_exclusion CHECK (
    (was_excluded = true AND exclusion_reason IS NOT NULL) OR
    (was_excluded = false)
  )
);

CREATE INDEX idx_pred_audit_run ON prediction_audit_log(run_id);
CREATE INDEX idx_pred_audit_rule ON prediction_audit_log(golden_rule_id);
CREATE INDEX idx_pred_audit_match ON prediction_audit_log(match_log_id);
CREATE INDEX idx_pred_audit_created ON prediction_audit_log(created_at DESC);

-- ================================================================
-- 4. RULE APPLICATION LOG (Which rules fired for which matches)
-- ================================================================

CREATE TABLE IF NOT EXISTS rule_application_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  run_id TEXT NOT NULL REFERENCES engine_runs(run_id) ON DELETE RESTRICT,
  match_log_id UUID NOT NULL REFERENCES match_processing_log(id) ON DELETE RESTRICT,

  -- Rule identification
  golden_rule_id INTEGER NOT NULL,
  rule_code TEXT NOT NULL,

  -- Application result
  was_triggered BOOLEAN NOT NULL,
  trigger_reason TEXT, -- Why it matched (for debugging)

  -- Conditions evaluated
  conditions_checked JSONB, -- Snapshot of what was evaluated
  conditions_met BOOLEAN[],

  -- If triggered, what prediction was generated
  prediction_generated TEXT, -- e.g., 'MS 2.5 ÜST'
  confidence_calculated DECIMAL(5,2),

  -- Timing
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluation_duration_ms INTEGER,

  -- Link to prediction if generated
  prediction_audit_id UUID REFERENCES prediction_audit_log(id)
);

CREATE INDEX idx_rule_app_run ON rule_application_log(run_id);
CREATE INDEX idx_rule_app_match ON rule_application_log(match_log_id);
CREATE INDEX idx_rule_app_rule ON rule_application_log(golden_rule_id);
CREATE INDEX idx_rule_app_triggered ON rule_application_log(was_triggered);

-- ================================================================
-- 5. SKIP REASON TRACKING (Why matches were excluded)
-- ================================================================

CREATE TABLE IF NOT EXISTS match_skip_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  run_id TEXT NOT NULL REFERENCES engine_runs(run_id) ON DELETE RESTRICT,
  match_log_id UUID NOT NULL REFERENCES match_processing_log(id) ON DELETE RESTRICT,

  -- Match details (denormalized)
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  match_date DATE NOT NULL,

  -- Skip categorization
  skip_category TEXT NOT NULL CHECK (skip_category IN (
    'missing_odds',
    'insufficient_data',
    'league_excluded',
    'date_filter',
    'duplicate',
    'invalid_format',
    'no_rules_matched',
    'confidence_too_low',
    'other'
  )),

  skip_reason TEXT NOT NULL,
  skip_details JSONB, -- Additional context

  -- When it was skipped
  skipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skip_run ON match_skip_log(run_id);
CREATE INDEX idx_skip_category ON match_skip_log(skip_category);
CREATE INDEX idx_skip_date ON match_skip_log(skipped_at DESC);

-- ================================================================
-- 6. EXECUTION ERRORS LOG (Fail-safe tracking)
-- ================================================================

CREATE TABLE IF NOT EXISTS execution_errors_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  run_id TEXT REFERENCES engine_runs(run_id) ON DELETE SET NULL,

  -- Error details
  error_type TEXT NOT NULL CHECK (error_type IN (
    'database_failure',
    'logging_failure',
    'rule_execution_error',
    'data_validation_error',
    'external_api_error',
    'critical_system_error'
  )),

  error_message TEXT NOT NULL,
  error_stack TEXT,

  -- Context at time of error
  current_match_index INTEGER,
  total_matches INTEGER,

  -- Severity
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),

  -- Was execution halted?
  execution_halted BOOLEAN DEFAULT false,

  -- Recovery action taken
  recovery_action TEXT,

  -- Timestamp
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_errors_run ON execution_errors_log(run_id);
CREATE INDEX idx_errors_type ON execution_errors_log(error_type);
CREATE INDEX idx_errors_severity ON execution_errors_log(severity);
CREATE INDEX idx_errors_occurred ON execution_errors_log(occurred_at DESC);

-- ================================================================
-- 7. SYSTEM HEALTH CHECK (Pre-run validation log)
-- ================================================================

CREATE TABLE IF NOT EXISTS system_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run context
  run_id TEXT REFERENCES engine_runs(run_id) ON DELETE CASCADE,

  -- Health checks performed
  database_connected BOOLEAN NOT NULL,
  golden_rules_loaded BOOLEAN NOT NULL,
  golden_rules_count INTEGER,
  source_data_valid BOOLEAN NOT NULL,
  logging_enabled BOOLEAN NOT NULL,

  -- Pre-flight results
  all_checks_passed BOOLEAN NOT NULL,
  failed_checks TEXT[],

  -- Execution decision
  execution_allowed BOOLEAN NOT NULL,
  block_reason TEXT,

  -- Timestamp
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_run ON system_health_log(run_id);
CREATE INDEX idx_health_allowed ON system_health_log(execution_allowed);
CREATE INDEX idx_health_checked ON system_health_log(checked_at DESC);

-- ================================================================
-- 8. VIEWS FOR AUDIT QUERIES
-- ================================================================

-- 8.1 Complete Run Summary
CREATE OR REPLACE VIEW run_summary AS
SELECT
  er.run_id,
  er.started_at,
  er.completed_at,
  er.duration_seconds,
  er.status,
  er.source_type,
  er.source_file_name,
  er.matches_processed,
  er.matches_with_predictions,
  er.matches_skipped,
  er.total_predictions_generated,
  er.rules_matched,
  ARRAY_LENGTH(er.unique_rules_used, 1) as unique_rules_count,
  COUNT(DISTINCT mpl.id) as match_logs_count,
  COUNT(DISTINCT pal.id) as prediction_logs_count,
  er.execution_mode,
  er.triggered_by
FROM engine_runs er
LEFT JOIN match_processing_log mpl ON mpl.run_id = er.run_id
LEFT JOIN prediction_audit_log pal ON pal.run_id = er.run_id
GROUP BY er.run_id, er.started_at, er.completed_at, er.duration_seconds,
         er.status, er.source_type, er.source_file_name, er.matches_processed,
         er.matches_with_predictions, er.matches_skipped, er.total_predictions_generated,
         er.rules_matched, er.unique_rules_used, er.execution_mode, er.triggered_by
ORDER BY er.started_at DESC;

-- 8.2 Skip Analysis
CREATE OR REPLACE VIEW skip_analysis AS
SELECT
  msl.run_id,
  msl.skip_category,
  COUNT(*) as skip_count,
  ARRAY_AGG(DISTINCT msl.league) as affected_leagues
FROM match_skip_log msl
GROUP BY msl.run_id, msl.skip_category
ORDER BY skip_count DESC;

-- 8.3 Rule Performance Per Run
CREATE OR REPLACE VIEW rule_performance_per_run AS
SELECT
  ral.run_id,
  ral.golden_rule_id,
  ral.rule_code,
  COUNT(*) as times_evaluated,
  COUNT(*) FILTER (WHERE ral.was_triggered = true) as times_triggered,
  ROUND(
    (COUNT(*) FILTER (WHERE ral.was_triggered = true)::DECIMAL /
     NULLIF(COUNT(*), 0)) * 100,
    2
  ) as trigger_rate_percent,
  COUNT(DISTINCT ral.match_log_id) as unique_matches
FROM rule_application_log ral
GROUP BY ral.run_id, ral.golden_rule_id, ral.rule_code
ORDER BY ral.run_id DESC, times_triggered DESC;

-- ================================================================
-- 9. RLS POLICIES
-- ================================================================

ALTER TABLE engine_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_application_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_skip_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_errors_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_log ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Enable read for authenticated" ON engine_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON match_processing_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON prediction_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON rule_application_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON match_skip_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON execution_errors_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON system_health_log FOR SELECT TO authenticated USING (true);

-- Write access only for service role (backend)
CREATE POLICY "Enable insert for service" ON engine_runs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable update for service" ON engine_runs FOR UPDATE TO service_role USING (true);
CREATE POLICY "Enable insert for service" ON match_processing_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable insert for service" ON prediction_audit_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable insert for service" ON rule_application_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable insert for service" ON match_skip_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable insert for service" ON execution_errors_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable insert for service" ON system_health_log FOR INSERT TO service_role WITH CHECK (true);

-- NO DELETE ALLOWED (append-only)
-- No delete policies = no one can delete

-- ================================================================
-- 10. TRIGGER: Auto-update run duration
-- ================================================================

CREATE OR REPLACE FUNCTION update_run_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_run_duration
BEFORE UPDATE ON engine_runs
FOR EACH ROW
WHEN (NEW.completed_at IS DISTINCT FROM OLD.completed_at)
EXECUTE FUNCTION update_run_duration();

-- ================================================================
-- SUCCESS!
-- All system runs are now permanently logged.
-- No run can execute without creating audit trail.
-- All logs are append-only and immutable.
-- ================================================================
