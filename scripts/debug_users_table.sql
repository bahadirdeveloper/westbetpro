-- ================================================================
-- DEBUG: Users tablosunu kontrol et
-- ================================================================

-- 1. Tablo hangi schema'da?
SELECT schemaname, tablename
FROM pg_tables
WHERE tablename = 'users';

-- 2. RLS aktif mi?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- 3. Hangi policy'ler var?
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'users';

-- 4. Tabloyu direkt okuyabilir miyiz?
SELECT email, role, is_active
FROM users
LIMIT 5;

-- 5. Eğer public schema'da değilse, tam path ile dene
SELECT email, role, is_active
FROM public.users
LIMIT 5;
