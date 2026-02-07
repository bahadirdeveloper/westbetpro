-- ================================================================
-- SCHEMA DEPLOYMENT SCRIPT
-- Copy and paste this into Supabase SQL Editor
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
-- 1. MATCHES TABLE - Maç verileri
-- ================================================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Maç bilgileri
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  match_date TEXT NOT NULL,
  match_time TEXT,

  -- Oranlar
  home_odds DECIMAL(10,2),
  draw_odds DECIMAL(10,2),
  away_odds DECIMAL(10,2),

  -- Alt/Üst oranları
  over_05_odds DECIMAL(10,2),
  under_05_odds DECIMAL(10,2),
  over_15_odds DECIMAL(10,2),
  under_15_odds DECIMAL(10,2),
  over_25_odds DECIMAL(10,2),
  under_25_odds DECIMAL(10,2),

  -- İlk Yarı oranları
  ht_over_05_odds DECIMAL(10,2),
  ht_under_05_odds DECIMAL(10,2),

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- ================================================================
-- 2. GOLDEN RULES TABLE - 50 Altın Kural
-- ================================================================
CREATE TABLE IF NOT EXISTS golden_rules (
  id SERIAL PRIMARY KEY,

  -- Kural bilgileri
  rule_code TEXT UNIQUE NOT NULL, -- Örn: "R001", "R042"
  rule_name TEXT NOT NULL,
  category TEXT NOT NULL, -- "iy_ust", "ms_ust", "kombin", etc.

  -- Durum
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 50, -- 1-100, yüksek = öncelikli

  -- Kural mantığı (Python code veya JSON)
  rule_logic JSONB NOT NULL,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT, -- Admin email
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_golden_rules_code ON golden_rules(rule_code);
CREATE INDEX IF NOT EXISTS idx_golden_rules_active ON golden_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_golden_rules_category ON golden_rules(category);

-- ================================================================
-- 3. RLS POLICIES
-- ================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_rules ENABLE ROW LEVEL SECURITY;

-- Users: Authenticated kullanıcılar okuyabilir
CREATE POLICY "Enable read for authenticated" ON users FOR SELECT TO authenticated USING (true);

-- Matches: Authenticated kullanıcılar okuyabilir
CREATE POLICY "Enable read for authenticated" ON matches FOR SELECT TO authenticated USING (true);

-- Golden Rules: Authenticated kullanıcılar okuyabilir
CREATE POLICY "Enable read for authenticated" ON golden_rules FOR SELECT TO authenticated USING (true);

-- Service role her şeyi yapabilir
CREATE POLICY "Enable all for service" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Enable all for service" ON matches FOR ALL TO service_role USING (true);
CREATE POLICY "Enable all for service" ON golden_rules FOR ALL TO service_role USING (true);

-- ================================================================
-- 4. ADMIN USER OLUŞTUR
-- ================================================================

-- Admin kullanıcısını ekle (eğer yoksa)
INSERT INTO users (email, full_name, role, is_active)
VALUES ('admin@westbetpro.com', 'Admin Şerifi', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- 5. VERIFICATION
-- ================================================================

-- Tabloları kontrol et
SELECT tablename FROM pg_tables
WHERE tablename IN ('users', 'matches', 'golden_rules')
ORDER BY tablename;

-- User sayısı
SELECT COUNT(*) as user_count FROM users;

-- Admin kullanıcısı var mı?
SELECT email, role, is_active FROM users WHERE role = 'admin';

-- ================================================================
-- SUCCESS!
-- ================================================================
