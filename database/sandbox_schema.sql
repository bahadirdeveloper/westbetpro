-- ================================================================
-- SANDBOX TESTING ENVIRONMENT
-- Read-only historical data testing for draft rules
-- NO LIVE DATA IMPACT - ISOLATED TESTING ONLY
-- ================================================================

-- ================================================================
-- 1. CANDIDATE RULES (Draft rules being tested)
-- ================================================================

CREATE TABLE IF NOT EXISTS candidate_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  candidate_id TEXT UNIQUE NOT NULL, -- e.g., "CAND-MS-001"
  rule_name TEXT NOT NULL,
  rule_description TEXT NOT NULL,

  -- Rule definition (Python code or conditions JSON)
  rule_logic TEXT NOT NULL, -- Python function or JSON conditions
  rule_type TEXT NOT NULL CHECK (rule_type IN ('python_function', 'json_conditions')),

  -- Prediction details
  prediction_type TEXT NOT NULL, -- 'MS 2.5 ÜST', etc.
  confidence_base DECIMAL(5,2) NOT NULL,

  -- Conditions (for JSON type)
  conditions JSONB, -- {home_odds: {min: 1.5, max: 3.0}, ...}

  -- Metadata
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Testing status
  test_status TEXT DEFAULT 'draft' CHECK (test_status IN (
    'draft',           -- Not yet tested
    'testing',         -- Currently being tested
    'tested',          -- Test completed
    'approved',        -- Ready for promotion
    'rejected',        -- Failed testing
    'promoted'         -- Moved to golden_rules
  )),

  -- Test results summary (populated after testing)
  last_tested_at TIMESTAMPTZ,
  test_sample_size INTEGER,
  test_win_rate DECIMAL(5,2),
  test_confidence_accuracy DECIMAL(5,2),

  -- Notes
  notes TEXT
);

CREATE INDEX idx_candidate_rules_status ON candidate_rules(test_status);
CREATE INDEX idx_candidate_rules_created ON candidate_rules(created_at DESC);

-- ================================================================
-- 2. SANDBOX TEST RUNS (Test execution log)
-- ================================================================

CREATE TABLE IF NOT EXISTS sandbox_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Test identification
  test_run_id TEXT UNIQUE NOT NULL, -- e.g., "TEST-20260206-143022"
  test_name TEXT NOT NULL,

  -- Candidate rule being tested
  candidate_id TEXT NOT NULL REFERENCES candidate_rules(candidate_id),

  -- Historical data window
  test_period_start DATE NOT NULL,
  test_period_end DATE NOT NULL,

  -- Baseline comparison
  baseline_type TEXT NOT NULL CHECK (baseline_type IN (
    'no_rules',           -- Compare against no predictions
    'golden_rules',       -- Compare against current golden rules
    'specific_rule'       -- Compare against specific golden rule
  )),
  baseline_rule_id INTEGER, -- If comparing to specific golden rule

  -- Test execution
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_by TEXT NOT NULL,
  execution_duration_seconds INTEGER,

  -- Results summary
  total_matches_tested INTEGER NOT NULL,
  candidate_predictions_count INTEGER NOT NULL,
  baseline_predictions_count INTEGER,

  -- Performance metrics
  candidate_win_count INTEGER,
  candidate_loss_count INTEGER,
  candidate_win_rate DECIMAL(5,2),

  baseline_win_count INTEGER,
  baseline_loss_count INTEGER,
  baseline_win_rate DECIMAL(5,2),

  -- Deltas (candidate - baseline)
  win_rate_delta DECIMAL(5,2),
  confidence_delta DECIMAL(5,2),
  volatility_delta DECIMAL(5,2),

  -- Statistical significance
  p_value DECIMAL(5,4),
  is_significant BOOLEAN,

  -- Conclusion
  recommendation TEXT CHECK (recommendation IN (
    'approve',      -- Performs better, ready for production
    'reject',       -- Performs worse, discard
    'needs_tuning', -- Shows promise but needs adjustment
    'insufficient_data' -- Not enough samples
  )),
  recommendation_reason TEXT,

  -- Test configuration
  test_config JSONB,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX idx_sandbox_runs_candidate ON sandbox_test_runs(candidate_id);
CREATE INDEX idx_sandbox_runs_executed ON sandbox_test_runs(executed_at DESC);

-- ================================================================
-- 3. SANDBOX MATCH RESULTS (Per-match test results)
-- ================================================================

CREATE TABLE IF NOT EXISTS sandbox_match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to test run
  test_run_id TEXT NOT NULL REFERENCES sandbox_test_runs(test_run_id),

  -- Historical match (read-only reference)
  match_id UUID NOT NULL, -- References matches table
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  match_date DATE NOT NULL,

  -- Actual outcome (from history)
  actual_outcome TEXT NOT NULL, -- 'won', 'lost', 'half_won'
  actual_home_score INTEGER,
  actual_away_score INTEGER,

  -- Candidate rule prediction
  candidate_predicted BOOLEAN DEFAULT false,
  candidate_prediction TEXT,
  candidate_confidence DECIMAL(5,2),
  candidate_result TEXT, -- 'won', 'lost', NULL if not predicted

  -- Baseline comparison
  baseline_predicted BOOLEAN DEFAULT false,
  baseline_prediction TEXT,
  baseline_confidence DECIMAL(5,2),
  baseline_result TEXT,

  -- Match conditions (snapshot)
  home_odds DECIMAL(5,2),
  draw_odds DECIMAL(5,2),
  away_odds DECIMAL(5,2),

  -- Why candidate triggered/didn't trigger
  candidate_trigger_reason TEXT,
  baseline_trigger_reason TEXT,

  -- Timestamps
  tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sandbox_match_test ON sandbox_match_results(test_run_id);
CREATE INDEX idx_sandbox_match_match ON sandbox_match_results(match_id);
CREATE INDEX idx_sandbox_match_date ON sandbox_match_results(match_date);

-- ================================================================
-- 4. SANDBOX COMPARISON REPORT (Aggregate comparison)
-- ================================================================

CREATE TABLE IF NOT EXISTS sandbox_comparison_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to test run
  test_run_id TEXT NOT NULL REFERENCES sandbox_test_runs(test_run_id),

  -- Comparison category
  category TEXT NOT NULL CHECK (category IN (
    'overall_performance',
    'by_league',
    'by_odds_range',
    'by_prediction_type',
    'by_confidence_bucket',
    'volatility_analysis'
  )),

  category_value TEXT, -- e.g., 'LaLiga' for by_league

  -- Candidate metrics
  candidate_total INTEGER,
  candidate_won INTEGER,
  candidate_lost INTEGER,
  candidate_win_rate DECIMAL(5,2),
  candidate_avg_confidence DECIMAL(5,2),

  -- Baseline metrics
  baseline_total INTEGER,
  baseline_won INTEGER,
  baseline_lost INTEGER,
  baseline_win_rate DECIMAL(5,2),
  baseline_avg_confidence DECIMAL(5,2),

  -- Deltas
  win_rate_delta DECIMAL(5,2),
  confidence_delta DECIMAL(5,2),

  -- Statistical indicators
  sample_size_sufficient BOOLEAN,
  confidence_interval_lower DECIMAL(5,2),
  confidence_interval_upper DECIMAL(5,2),

  -- Generated at
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sandbox_report_test ON sandbox_comparison_report(test_run_id);
CREATE INDEX idx_sandbox_report_category ON sandbox_comparison_report(category);

-- ================================================================
-- 5. VIEWS FOR SANDBOX ANALYSIS
-- ================================================================

-- 5.1 Candidate Rule Performance Summary
CREATE OR REPLACE VIEW candidate_performance_summary AS
SELECT
  cr.candidate_id,
  cr.rule_name,
  cr.test_status,
  COUNT(DISTINCT str.test_run_id) as times_tested,
  MAX(str.executed_at) as last_tested,
  AVG(str.candidate_win_rate) as avg_win_rate,
  AVG(str.win_rate_delta) as avg_delta_vs_baseline,
  COUNT(*) FILTER (WHERE str.recommendation = 'approve') as approval_count,
  COUNT(*) FILTER (WHERE str.recommendation = 'reject') as rejection_count
FROM candidate_rules cr
LEFT JOIN sandbox_test_runs str ON str.candidate_id = cr.candidate_id
GROUP BY cr.candidate_id, cr.rule_name, cr.test_status
ORDER BY avg_win_rate DESC NULLS LAST;

-- 5.2 Test Run Results Overview
CREATE OR REPLACE VIEW test_runs_overview AS
SELECT
  str.test_run_id,
  str.test_name,
  cr.rule_name as candidate_rule,
  str.test_period_start,
  str.test_period_end,
  str.total_matches_tested,
  str.candidate_win_rate,
  str.baseline_win_rate,
  str.win_rate_delta,
  str.recommendation,
  str.executed_at
FROM sandbox_test_runs str
JOIN candidate_rules cr ON cr.candidate_id = str.candidate_id
ORDER BY str.executed_at DESC;

-- 5.3 Match-by-Match Comparison
CREATE OR REPLACE VIEW match_comparison_detail AS
SELECT
  smr.test_run_id,
  smr.home_team,
  smr.away_team,
  smr.league,
  smr.match_date,
  smr.actual_outcome,
  smr.candidate_predicted,
  smr.candidate_prediction,
  smr.candidate_result,
  smr.baseline_predicted,
  smr.baseline_prediction,
  smr.baseline_result,
  CASE
    WHEN smr.candidate_result = 'won' AND smr.baseline_result != 'won' THEN 'candidate_better'
    WHEN smr.baseline_result = 'won' AND smr.candidate_result != 'won' THEN 'baseline_better'
    WHEN smr.candidate_result = smr.baseline_result THEN 'same'
    ELSE 'different'
  END as comparison
FROM sandbox_match_results smr
ORDER BY smr.match_date DESC;

-- ================================================================
-- 6. RLS POLICIES
-- ================================================================

ALTER TABLE candidate_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_comparison_report ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated
CREATE POLICY "Enable read for authenticated" ON candidate_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON sandbox_test_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON sandbox_match_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON sandbox_comparison_report FOR SELECT TO authenticated USING (true);

-- Write access for service role (backend only)
CREATE POLICY "Enable write for service" ON candidate_rules FOR ALL TO service_role USING (true);
CREATE POLICY "Enable write for service" ON sandbox_test_runs FOR ALL TO service_role USING (true);
CREATE POLICY "Enable write for service" ON sandbox_match_results FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable write for service" ON sandbox_comparison_report FOR INSERT TO service_role WITH CHECK (true);

-- ================================================================
-- 7. SAFETY CONSTRAINTS
-- ================================================================

-- Prevent candidate rules from affecting golden_rules table
-- (No foreign key to golden_rules - keeps sandbox isolated)

-- Ensure test runs only reference historical data
ALTER TABLE sandbox_match_results
ADD CONSTRAINT test_only_historical_matches
CHECK (match_date < CURRENT_DATE - INTERVAL '1 day');

-- Prevent accidental promotion without approval
CREATE OR REPLACE FUNCTION prevent_auto_promotion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.test_status = 'promoted' AND OLD.test_status != 'approved' THEN
    RAISE EXCEPTION 'Cannot promote rule without approval status';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_auto_promotion
BEFORE UPDATE ON candidate_rules
FOR EACH ROW
EXECUTE FUNCTION prevent_auto_promotion();

-- ================================================================
-- SUCCESS!
-- Sandbox environment is ready.
-- NO LIVE DATA IMPACT.
-- All tests run on historical data only.
-- Admin approval required for promotion.
-- ================================================================
