-- ================================================================
-- WESTBETPRO SYSTEM CONTEXT FIX
-- Ekranlar arası veri bağlantılarını ve trace edilebilirliği sağlar
-- ================================================================

-- ================================================================
-- STEP 1: Golden Rules Table (Altın Kurallar)
-- ================================================================

CREATE TABLE IF NOT EXISTS golden_rules (
  id SERIAL PRIMARY KEY,
  rule_code TEXT UNIQUE NOT NULL,  -- Örn: "R001", "R050"
  rule_name TEXT NOT NULL,         -- Örn: "Yüksek Oran Kombinasyonu"
  rule_description TEXT,           -- Detaylı açıklama

  -- Rule logic (JSON)
  conditions JSONB,
  /* Örnek:
  {
    "home_iy_ust_oran": {"min": 1.70, "max": 2.50},
    "away_iy_ust_oran": {"min": 1.70, "max": 2.50},
    "ms_ust_oran": {"min": 1.85}
  }
  */

  -- Performance tracking
  is_active BOOLEAN DEFAULT true,
  success_rate DECIMAL(5,2),  -- Güncellenir
  total_predictions INTEGER DEFAULT 0,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_golden_rules_active ON golden_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_golden_rules_code ON golden_rules(rule_code);

-- ================================================================
-- STEP 2: Engine Runs Table
-- ================================================================

CREATE TABLE IF NOT EXISTS engine_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run info
  run_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),

  -- Stats
  matches_processed INTEGER DEFAULT 0,
  opportunities_found INTEGER DEFAULT 0,
  execution_time_ms INTEGER,

  -- Filters used
  filters JSONB,
  /* Örnek:
  {
    "date_from": "2026-02-06",
    "leagues": ["Premier Lig", "La Liga"],
    "min_confidence": 80
  }
  */

  -- Error (if failed)
  error_message TEXT,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_engine_runs_status ON engine_runs(status);
CREATE INDEX IF NOT EXISTS idx_engine_runs_date ON engine_runs(run_date DESC);

-- ================================================================
-- STEP 3: Update Predictions Table (Add Context)
-- ================================================================

-- Önce yeni kolonları ekle
ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS golden_rule_id INTEGER REFERENCES golden_rules(id),
ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES engine_runs(id),
ADD COLUMN IF NOT EXISTS odds DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS stake DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS potential_return DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS outcome BOOLEAN,  -- true=won, false=lost, null=pending
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_predictions_rule ON predictions(golden_rule_id);
CREATE INDEX IF NOT EXISTS idx_predictions_run ON predictions(run_id);
CREATE INDEX IF NOT EXISTS idx_predictions_outcome ON predictions(outcome);

-- ================================================================
-- STEP 4: Update Matches Table (Add Live Tracking)
-- ================================================================

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS live_status TEXT CHECK (
  live_status IN ('not_started', 'first_half', 'halftime', 'second_half', 'finished', 'postponed')
),
ADD COLUMN IF NOT EXISTS home_score INTEGER,
ADD COLUMN IF NOT EXISTS away_score INTEGER,
ADD COLUMN IF NOT EXISTS halftime_home INTEGER,
ADD COLUMN IF NOT EXISTS halftime_away INTEGER,
ADD COLUMN IF NOT EXISTS elapsed_minutes INTEGER,
ADD COLUMN IF NOT EXISTS api_football_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS last_live_update TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_live_status ON matches(live_status);
CREATE INDEX IF NOT EXISTS idx_matches_api_id ON matches(api_football_id);

-- ================================================================
-- STEP 5: Live Match Updates Table (Real-time Tracking)
-- ================================================================

CREATE TABLE IF NOT EXISTS live_match_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,

  -- Score info
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  elapsed_minutes INTEGER,
  period TEXT,  -- "1H", "HT", "2H", "FT"

  -- Status
  match_status TEXT,

  -- Prediction evaluation
  prediction_status TEXT,  -- "winning", "losing", "pending"

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_updates_match ON live_match_updates(match_id);
CREATE INDEX IF NOT EXISTS idx_live_updates_prediction ON live_match_updates(prediction_id);
CREATE INDEX IF NOT EXISTS idx_live_updates_created ON live_match_updates(created_at DESC);

-- ================================================================
-- STEP 6: Rule Performance View
-- ================================================================

CREATE OR REPLACE VIEW rule_performance AS
SELECT
  gr.id AS golden_rule_id,
  gr.rule_code,
  gr.rule_name,
  gr.rule_description,
  gr.is_active,

  -- Prediction stats
  COUNT(p.id) AS total_predictions,
  COUNT(CASE WHEN p.outcome = true THEN 1 END) AS won_count,
  COUNT(CASE WHEN p.outcome = false THEN 1 END) AS lost_count,
  COUNT(CASE WHEN p.outcome IS NULL THEN 1 END) AS pending_count,

  -- Success rate
  ROUND(
    (COUNT(CASE WHEN p.outcome = true THEN 1 END)::DECIMAL /
     NULLIF(COUNT(CASE WHEN p.outcome IS NOT NULL THEN 1 END), 0)) * 100,
    2
  ) AS success_rate,

  -- Confidence
  ROUND(AVG(p.confidence), 2) AS avg_confidence,

  -- Financial
  SUM(CASE WHEN p.outcome = true THEN p.potential_return - p.stake ELSE -p.stake END) AS total_profit_loss,

  -- Recent activity
  MAX(p.created_at) AS last_prediction_date

FROM golden_rules gr
LEFT JOIN predictions p ON p.golden_rule_id = gr.id
GROUP BY gr.id, gr.rule_code, gr.rule_name, gr.rule_description, gr.is_active
ORDER BY total_predictions DESC;

-- ================================================================
-- STEP 7: Context-Rich Predictions View
-- ================================================================

CREATE OR REPLACE VIEW predictions_with_context AS
SELECT
  -- Prediction info
  p.id AS prediction_id,
  p.prediction_type,
  p.confidence,
  p.odds,
  p.stake,
  p.potential_return,
  p.outcome,
  p.status,
  p.created_at AS prediction_created_at,
  p.settled_at,

  -- Match info
  m.id AS match_id,
  m.home_team,
  m.away_team,
  m.league,
  m.match_date,
  m.match_time,
  m.live_status,
  m.home_score,
  m.away_score,
  m.elapsed_minutes,

  -- Rule info
  gr.id AS golden_rule_id,
  gr.rule_code,
  gr.rule_name,
  gr.rule_description,

  -- Run info
  er.id AS run_id,
  er.run_date,
  er.status AS run_status,

  -- Live update (latest)
  lmu.home_score AS live_home_score,
  lmu.away_score AS live_away_score,
  lmu.elapsed_minutes AS live_elapsed,
  lmu.prediction_status AS live_prediction_status,
  lmu.created_at AS last_live_update

FROM predictions p
JOIN matches m ON m.id = p.match_id
LEFT JOIN golden_rules gr ON gr.id = p.golden_rule_id
LEFT JOIN engine_runs er ON er.id = p.run_id
LEFT JOIN LATERAL (
  SELECT *
  FROM live_match_updates
  WHERE prediction_id = p.id
  ORDER BY created_at DESC
  LIMIT 1
) lmu ON true
ORDER BY p.created_at DESC;

-- ================================================================
-- STEP 8: Insert Sample Golden Rules (50 Rules)
-- ================================================================

-- İlk 10 kural örneği (geri kalan 40'ı da eklenebilir)
INSERT INTO golden_rules (rule_code, rule_name, rule_description, conditions, is_active) VALUES
('R001', 'Yüksek Oran Kombinasyonu', 'İY ve MS oran dengesi', '{"iy_oran_min": 1.70, "ms_oran_min": 1.85}', true),
('R002', 'Çift Şans Garantisi', 'Düşük riskli çift şans kombinasyonu', '{"cift_sans_oran_max": 1.50}', true),
('R003', 'İY Gol Garantisi', 'İlk yarıda gol kesinliği yüksek', '{"iy_ust_05": true, "confidence_min": 85}', true),
('R004', 'Skor Dengesizliği', 'Takımlar arası büyük fark', '{"home_strength": "high", "away_strength": "low"}', true),
('R005', 'Altın Üçlü', 'Üç farklı pazarda yüksek güven', '{"markets": ["MS", "IY", "KG"], "min_confidence": 80}', true),
('R006', 'Lig Süprizleri', 'Alt lige üst takım şaşırtması', '{"league_diff": 2, "away_favori": true}', true),
('R007', 'Form Analizi', 'Son 5 maç formu kritik', '{"form_score": 80}', true),
('R008', 'Mevki Avantajı', 'Ev sahibi mevki farkı', '{"home_position_advantage": 5}', true),
('R009', 'Gol Kralları', 'Golcü takımlar karşılaşması', '{"avg_goals_home": 2.5, "avg_goals_away": 2.0}', true),
('R010', 'Savunma Duvarı', 'Defans odaklı maç', '{"clean_sheet_rate": 60}', true)
ON CONFLICT (rule_code) DO NOTHING;

-- ================================================================
-- STEP 9: Enable RLS (Row Level Security)
-- ================================================================

-- Golden Rules
ALTER TABLE golden_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
ON golden_rules FOR SELECT
TO authenticated
USING (true);

-- Engine Runs
ALTER TABLE engine_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
ON engine_runs FOR SELECT
TO authenticated
USING (true);

-- Live Match Updates
ALTER TABLE live_match_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
ON live_match_updates FOR SELECT
TO authenticated
USING (true);

-- ================================================================
-- STEP 10: Grant Permissions
-- ================================================================

-- Authenticated users can read
GRANT SELECT ON golden_rules TO authenticated;
GRANT SELECT ON engine_runs TO authenticated;
GRANT SELECT ON live_match_updates TO authenticated;
GRANT SELECT ON rule_performance TO authenticated;
GRANT SELECT ON predictions_with_context TO authenticated;

-- Service role can do everything
GRANT ALL ON golden_rules TO service_role;
GRANT ALL ON engine_runs TO service_role;
GRANT ALL ON live_match_updates TO service_role;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- 1. Check golden rules
SELECT * FROM golden_rules LIMIT 5;

-- 2. Check predictions with context
SELECT * FROM predictions_with_context LIMIT 10;

-- 3. Check rule performance
SELECT * FROM rule_performance ORDER BY success_rate DESC LIMIT 10;

-- ================================================================
-- SUCCESS!
-- Context bağlantıları kuruldu:
-- - Predictions → Matches (match_id)
-- - Predictions → Golden Rules (golden_rule_id)
-- - Predictions → Engine Runs (run_id)
-- - Live Match Updates → Predictions (prediction_id)
--
-- Artık her prediction trace edilebilir!
-- ================================================================

-- ================================================================
-- STEP 11: Add Live Score Columns to Predictions Table
-- ================================================================
-- These columns allow the Vercel cron endpoint to update
-- live scores directly on predictions (denormalized for fast reads)

ALTER TABLE predictions
ADD COLUMN IF NOT EXISTS home_score INTEGER,
ADD COLUMN IF NOT EXISTS away_score INTEGER,
ADD COLUMN IF NOT EXISTS halftime_home INTEGER,
ADD COLUMN IF NOT EXISTS halftime_away INTEGER,
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_finished BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS live_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS elapsed INTEGER,
ADD COLUMN IF NOT EXISTS prediction_result TEXT;

-- Indexes for live score queries
CREATE INDEX IF NOT EXISTS idx_predictions_live ON predictions(is_live) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(match_date);
CREATE INDEX IF NOT EXISTS idx_predictions_finished ON predictions(is_finished) WHERE is_finished = false;

-- Grant update permissions for anon role (needed for Vercel serverless)
GRANT UPDATE ON predictions TO anon;
GRANT UPDATE ON predictions TO authenticated;
