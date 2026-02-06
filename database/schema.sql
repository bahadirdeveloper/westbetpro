-- ================================================================
-- PREDICTION SYSTEM TABLES
-- Run in: Supabase Dashboard → SQL Editor
-- ================================================================

-- ================================================================
-- 0. USERS TABLE - Admin kullanıcıları
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth bilgileri
  email TEXT UNIQUE NOT NULL,

  -- Kullanıcı bilgileri
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer')),

  -- Durum
  is_active BOOLEAN DEFAULT true,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ================================================================
-- 1. RUNS TABLE - Her engine çalışmasını kaydet
-- ================================================================
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run bilgileri
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- İstatistikler
  matches_processed INT DEFAULT 0,
  opportunities_found INT DEFAULT 0,
  execution_time_ms INT, -- Milliseconds

  -- Filtreler (hangi maçlar işlendi)
  filters JSONB,
  /* Örnek:
  {
    "date_from": "2026-02-06",
    "date_to": "2026-02-07",
    "leagues": ["PREMIER_LIG", "LA_LIGA"],
    "min_confidence": 85
  }
  */

  -- Hata bilgisi (varsa)
  error_message TEXT,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);

-- ================================================================
-- 2. PREDICTIONS TABLE - Bulunan fırsatlar
-- ================================================================
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Run referansı
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,

  -- Maç bilgileri
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  match_date TEXT NOT NULL,
  match_time TEXT,

  -- Tahmin detayları
  prediction TEXT NOT NULL, -- Örn: "İY 0.5 ÜST", "MS 2.5 ÜST"
  confidence INT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),

  -- Alternatif tahminler (JSON array)
  alternative_predictions JSONB,
  /* Örnek:
  [
    {"bet": "MS 1.5 ÜST", "confidence": 88, "note": "Kural #2"},
    {"bet": "İY 0.5 ÜST", "confidence": 85, "note": "Kural #5"}
  ]
  */

  -- Eşleşen kurallar
  matched_rules JSONB,
  /* Örnek:
  [
    {"rule_id": "R001", "rule_name": "Yüksek Oran Kombinasyonu"},
    {"rule_id": "R005", "rule_name": "İY Gol Garantisi"}
  ]
  */

  -- Not (opsiyonel)
  note TEXT,

  -- Durum takibi
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'won', 'lost')),
  result TEXT, -- Maç sonucu geldiğinde

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique: Aynı run'da aynı maç için aynı tahmin tekrar oluşmasın
  UNIQUE(run_id, match_id, prediction)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_predictions_run_id ON predictions(run_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_predictions_confidence ON predictions(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_match_date ON predictions(match_date);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_predictions_matched_rules
ON predictions USING GIN(matched_rules);

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Check tables
SELECT tablename, schemaname
FROM pg_tables
WHERE tablename IN ('runs', 'predictions')
ORDER BY tablename;

-- Check runs structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'runs'
ORDER BY ordinal_position;

-- Check predictions structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'predictions'
ORDER BY ordinal_position;

-- ================================================================
-- SAMPLE QUERIES (test için)
-- ================================================================

-- En son run
-- SELECT * FROM runs ORDER BY started_at DESC LIMIT 1;

-- Yüksek güvenli tahminler
-- SELECT * FROM predictions
-- WHERE confidence >= 90
-- ORDER BY confidence DESC;

-- Run bazında özet
-- SELECT
--   r.id,
--   r.started_at,
--   r.matches_processed,
--   r.opportunities_found,
--   COUNT(p.id) as prediction_count
-- FROM runs r
-- LEFT JOIN predictions p ON p.run_id = r.id
-- GROUP BY r.id
-- ORDER BY r.started_at DESC;
