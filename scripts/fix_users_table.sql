-- ================================================================
-- FIX USERS TABLE - Eksik kolonları ekle
-- Copy and paste this into Supabase SQL Editor
-- ================================================================

-- Önce mevcut yapıyı kontrol edelim
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ================================================================
-- Eksik kolonları ekle (eğer yoksa)
-- ================================================================

-- full_name kolonu ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name TEXT;
  END IF;
END $$;

-- role kolonu ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'analyst', 'viewer'));
  END IF;
END $$;

-- is_active kolonu ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- last_login_at kolonu ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
END $$;

-- ================================================================
-- Indexes ekle (eğer yoksa)
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ================================================================
-- RLS Policies (eğer yoksa)
-- ================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Authenticated kullanıcılar okuyabilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'Enable read for authenticated'
  ) THEN
    EXECUTE 'CREATE POLICY "Enable read for authenticated" ON users FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- Service role her şeyi yapabilir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'Enable all for service'
  ) THEN
    EXECUTE 'CREATE POLICY "Enable all for service" ON users FOR ALL TO service_role USING (true)';
  END IF;
END $$;

-- ================================================================
-- Admin kullanıcısı oluştur/güncelle
-- ================================================================

-- Admin kullanıcısını ekle veya güncelle
INSERT INTO users (email, full_name, role, is_active)
VALUES ('admin@westbetpro.com', 'Admin Şerifi', 'admin', true)
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ================================================================
-- Verification
-- ================================================================

-- Güncellenmiş yapıyı kontrol et
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Admin kullanıcısını kontrol et
SELECT email, full_name, role, is_active
FROM users
WHERE email = 'admin@westbetpro.com';

-- ================================================================
-- SUCCESS!
-- Artık users tablosu hazır ve admin kullanıcısı mevcut
-- ================================================================
