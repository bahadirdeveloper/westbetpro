-- ================================================================
-- WESTBETPRO LEARNING INFRASTRUCTURE
-- Read-only statistical analysis and suggestion engine
-- ================================================================

-- ================================================================
-- 1. RULE PERFORMANCE TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS rule_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  golden_rule_id INTEGER NOT NULL,
  rule_code TEXT NOT NULL,

  -- Time window
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Performance metrics
  total_predictions INTEGER NOT NULL,
  won_count INTEGER NOT NULL,
  lost_count INTEGER NOT NULL,
  half_won_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,

  -- Success rate (calculated)
  success_rate DECIMAL(5,2),

  -- Confidence metrics
  avg_confidence DECIMAL(5,2),
  confidence_accuracy DECIMAL(5,2), -- How accurate confidence was

  -- Baseline comparison
  baseline_success_rate DECIMAL(5,2), -- Historical baseline
  delta_from_baseline DECIMAL(5,2),   -- Current - baseline

  -- Statistical significance
  confidence_interval_lower DECIMAL(5,2),
  confidence_interval_upper DECIMAL(5,2),
  p_value DECIMAL(5,4),
  is_significant BOOLEAN DEFAULT false,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(golden_rule_id, period_start, period_end)
);

CREATE INDEX idx_rule_stats_rule ON rule_statistics(golden_rule_id);
CREATE INDEX idx_rule_stats_period ON rule_statistics(period_start, period_end);

-- ================================================================
-- 2. LEAGUE RELIABILITY TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS league_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- League identification
  league TEXT NOT NULL,

  -- Time window
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Prediction type breakdown
  prediction_type TEXT, -- NULL = all types, or specific like "MS 2.5 ÜST"

  -- Performance
  total_predictions INTEGER NOT NULL,
  won_count INTEGER NOT NULL,
  lost_count INTEGER NOT NULL,
  success_rate DECIMAL(5,2),

  -- Reliability score (0-100)
  reliability_score DECIMAL(5,2),

  -- Variance
  variance DECIMAL(5,2),
  is_stable BOOLEAN DEFAULT true,

  -- Baseline comparison
  baseline_success_rate DECIMAL(5,2),
  delta_from_baseline DECIMAL(5,2),

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(league, prediction_type, period_start, period_end)
);

CREATE INDEX idx_league_stats_league ON league_statistics(league);
CREATE INDEX idx_league_stats_period ON league_statistics(period_start, period_end);

-- ================================================================
-- 3. TEMPORAL PATTERN ANALYSIS
-- ================================================================

CREATE TABLE IF NOT EXISTS temporal_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern type
  pattern_type TEXT NOT NULL, -- 'day_of_week', 'hour_of_day', 'seasonal'
  pattern_value TEXT NOT NULL, -- e.g., 'Monday', '18:00', 'Winter'

  -- Performance
  total_predictions INTEGER NOT NULL,
  won_count INTEGER NOT NULL,
  success_rate DECIMAL(5,2),

  -- Confidence analysis
  avg_confidence DECIMAL(5,2),
  confidence_inflation DECIMAL(5,2), -- Positive = over-confident

  -- Time window
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pattern_type, pattern_value, period_start, period_end)
);

CREATE INDEX idx_temporal_type ON temporal_patterns(pattern_type);

-- ================================================================
-- 4. SUGGESTION ENGINE OUTPUT
-- ================================================================

CREATE TABLE IF NOT EXISTS system_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id TEXT UNIQUE NOT NULL, -- e.g., "SUG-2026-001"

  -- Classification
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  category TEXT NOT NULL, -- 'rule_performance', 'league_reliability', etc.

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Data backing
  data JSONB NOT NULL,
  /* Example:
  {
    "rule_id": 42,
    "baseline_success_rate": 0.82,
    "current_success_rate": 0.74,
    "delta": -0.08,
    "sample_size": 60,
    "time_range": "2026-01-01 to 2026-02-06",
    "confidence_interval": "68% - 79% (95% CI)"
  }
  */

  -- Recommendation
  recommendation TEXT NOT NULL,
  justification TEXT NOT NULL,
  suggested_actions JSONB, -- Array of possible actions

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'deferred')),
  action_required BOOLEAN DEFAULT false,

  -- Admin response
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  action_taken TEXT, -- What admin actually did

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suggestions_status ON system_suggestions(status);
CREATE INDEX idx_suggestions_severity ON system_suggestions(severity);
CREATE INDEX idx_suggestions_created ON system_suggestions(created_at DESC);

-- ================================================================
-- 5. RULE CHANGE AUDIT LOG
-- ================================================================

CREATE TABLE IF NOT EXISTS rule_changes_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule identification
  golden_rule_id INTEGER NOT NULL,
  rule_code TEXT NOT NULL,

  -- Change details
  change_type TEXT NOT NULL, -- 'confidence_adjust', 'disable', 'enable', 'threshold_change'
  old_value JSONB,
  new_value JSONB,

  -- Justification
  reason TEXT NOT NULL,
  suggestion_id TEXT, -- Link to system_suggestions if applicable

  -- Who made the change
  changed_by TEXT NOT NULL, -- Admin email
  approved_by TEXT,

  -- Impact tracking
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_rule ON rule_changes_audit(golden_rule_id);
CREATE INDEX idx_audit_created ON rule_changes_audit(created_at DESC);

-- ================================================================
-- 6. CONFIDENCE CALIBRATION TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS confidence_calibration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Confidence bucket
  confidence_range TEXT NOT NULL, -- e.g., "80-85", "85-90", "90-95", "95-100"
  confidence_min INTEGER NOT NULL,
  confidence_max INTEGER NOT NULL,

  -- Actual performance in this bucket
  total_predictions INTEGER NOT NULL,
  won_count INTEGER NOT NULL,
  actual_success_rate DECIMAL(5,2),

  -- Expected vs actual
  expected_success_rate DECIMAL(5,2), -- Midpoint of confidence range
  calibration_error DECIMAL(5,2), -- actual - expected

  -- Time window
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(confidence_range, period_start, period_end)
);

CREATE INDEX idx_calibration_range ON confidence_calibration(confidence_range);

-- ================================================================
-- 7. ANALYTICS VIEWS (READ-ONLY)
-- ================================================================

-- 7.1 Current Rule Performance (Last 30 days)
CREATE OR REPLACE VIEW current_rule_performance AS
SELECT
  gr.id AS golden_rule_id,
  gr.rule_code,
  gr.rule_name,

  -- Last 30 days
  COUNT(p.id) AS total_predictions,
  COUNT(CASE WHEN p.outcome = true THEN 1 END) AS won_count,
  COUNT(CASE WHEN p.outcome = false THEN 1 END) AS lost_count,

  ROUND(
    (COUNT(CASE WHEN p.outcome = true THEN 1 END)::DECIMAL /
     NULLIF(COUNT(CASE WHEN p.outcome IS NOT NULL THEN 1 END), 0)) * 100,
    2
  ) AS success_rate,

  ROUND(AVG(p.confidence), 2) AS avg_confidence,

  gr.success_rate AS baseline_success_rate,

  ROUND(
    (COUNT(CASE WHEN p.outcome = true THEN 1 END)::DECIMAL /
     NULLIF(COUNT(CASE WHEN p.outcome IS NOT NULL THEN 1 END), 0)) * 100
    - gr.success_rate,
    2
  ) AS delta_from_baseline

FROM golden_rules gr
LEFT JOIN predictions p ON p.golden_rule_id = gr.id
  AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND p.outcome IS NOT NULL
GROUP BY gr.id, gr.rule_code, gr.rule_name, gr.success_rate
ORDER BY success_rate DESC NULLS LAST;

-- 7.2 League Reliability (Last 60 days)
CREATE OR REPLACE VIEW league_reliability AS
SELECT
  m.league,

  COUNT(p.id) AS total_predictions,
  COUNT(CASE WHEN p.outcome = true THEN 1 END) AS won_count,

  ROUND(
    (COUNT(CASE WHEN p.outcome = true THEN 1 END)::DECIMAL /
     NULLIF(COUNT(CASE WHEN p.outcome IS NOT NULL THEN 1 END), 0)) * 100,
    2
  ) AS success_rate,

  ROUND(STDDEV(CASE WHEN p.outcome = true THEN 1.0 ELSE 0.0 END), 4) AS variance,

  COUNT(p.id) >= 20 AS sufficient_sample

FROM matches m
JOIN predictions p ON p.match_id = m.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '60 days'
  AND p.outcome IS NOT NULL
GROUP BY m.league
ORDER BY success_rate DESC;

-- 7.3 Pending Suggestions (Action Required)
CREATE OR REPLACE VIEW pending_suggestions AS
SELECT
  suggestion_id,
  severity,
  category,
  title,
  description,
  data,
  recommendation,
  created_at,
  CURRENT_DATE - created_at::DATE AS days_pending
FROM system_suggestions
WHERE status = 'pending'
  AND action_required = true
ORDER BY
  CASE severity
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  created_at ASC;

-- ================================================================
-- 8. RLS POLICIES (Read access for authenticated)
-- ================================================================

ALTER TABLE rule_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporal_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_changes_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_calibration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated" ON rule_statistics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON league_statistics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON temporal_patterns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON system_suggestions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON rule_changes_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON confidence_calibration FOR SELECT TO authenticated USING (true);

-- Service role can write
CREATE POLICY "Enable write for service" ON rule_statistics FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable write for service" ON league_statistics FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable write for service" ON temporal_patterns FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable write for service" ON system_suggestions FOR ALL TO service_role USING (true);
CREATE POLICY "Enable write for service" ON rule_changes_audit FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable write for service" ON confidence_calibration FOR INSERT TO service_role WITH CHECK (true);

-- ================================================================
-- SUCCESS!
-- Learning infrastructure is ready.
-- All tables are READ-ONLY for analysis.
-- NO automatic rule modifications.
-- Humans decide all changes.
-- ================================================================
