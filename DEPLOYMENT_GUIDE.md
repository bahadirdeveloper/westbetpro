# 🚀 WestBetPro - Production Deployment Guide

**Date**: February 6, 2026
**Version**: 1.0.0
**Status**: Ready for Production

---

## Pre-Deployment Checklist

### ✅ Prerequisites
- [ ] Supabase project created
- [ ] `.env` file configured with correct credentials
- [ ] Node.js 18+ installed
- [ ] Python 3.9+ installed
- [ ] All dependencies installed

### ✅ Environment Variables

Create `.env` file in project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Database (for Python backend)
DATABASE_URL=your_supabase_connection_string
```

---

## Deployment Steps

### Step 1: Database Schema Deployment

Deploy SQL schemas in this exact order:

#### 1.1. Core Schema
```bash
# In Supabase SQL Editor, run:
database/schema.sql
```

**What it does**:
- Creates core tables (matches, predictions, golden_rules, users)
- Sets up RLS policies
- Creates indexes

**Verification**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('matches', 'predictions', 'golden_rules', 'users');
```

Expected: 4 tables

---

#### 1.2. Audit & Historical Logging Schema
```bash
# In Supabase SQL Editor, run:
database/audit_schema.sql
```

**What it does**:
- Creates engine_runs (immutable run logging)
- Creates match_processing_log
- Creates prediction_audit_log
- Creates rule_application_log
- Creates match_skip_log
- Creates execution_errors_log
- Creates system_health_log

**Verification**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%_log' OR table_name LIKE 'engine_runs';
```

Expected: 7 tables

---

#### 1.3. Learning Infrastructure Schema
```bash
# In Supabase SQL Editor, run:
database/learning_schema.sql
```

**What it does**:
- Creates rule_statistics
- Creates league_statistics
- Creates temporal_patterns
- Creates system_suggestions
- Creates rule_changes_audit
- Creates confidence_calibration

**Verification**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('rule_statistics', 'system_suggestions');
```

Expected: 6 tables

---

#### 1.4. Sandbox Testing Schema
```bash
# In Supabase SQL Editor, run:
database/sandbox_schema.sql
```

**What it does**:
- Creates candidate_rules
- Creates sandbox_test_runs
- Creates sandbox_match_results
- Creates sandbox_comparison_report

**Verification**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'candidate_%' OR table_name LIKE 'sandbox_%';
```

Expected: 4 tables

---

#### 1.5. Intelligence Output Schema (Human-in-the-Loop)
```bash
# In Supabase SQL Editor, run:
database/intelligence_output_schema.sql
```

**What it does**:
- Creates intelligence_outputs (UI-First outputs)
- Creates admin_actions_log
- Creates ui_display_queue
- Creates system_blocked_events
- Creates views for admin UI

**Verification**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('intelligence_outputs', 'system_blocked_events');

SELECT viewname FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE '%admin%';
```

Expected: 4 tables, 5 views

---

#### 1.6. Migrations (Optional Updates)
```bash
# In Supabase SQL Editor, run:
database/migrations.sql
```

**What it does**:
- Any schema updates
- Data migrations
- Index optimizations

---

### Step 2: Admin User Creation

#### 2.1. Create Auth User
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Email: `admin@westbetpro.com`
4. Password: `your_secure_password`
5. Check "Auto Confirm User"

#### 2.2. Add to Users Table
```sql
-- Get the user ID
SELECT id, email FROM auth.users WHERE email = 'admin@westbetpro.com';

-- Insert into users table (replace UUID)
INSERT INTO users (id, email, role)
VALUES (
  'your_user_uuid_from_above',
  'admin@westbetpro.com',
  'admin'
);
```

**Verification**:
```sql
SELECT * FROM users WHERE role = 'admin';
```

---

### Step 3: Python Dependencies

#### 3.1. Install Backend Dependencies
```bash
cd /Users/bahadirgemalmaz/Desktop/WestBetPro

pip3 install supabase-py scipy numpy python-dotenv fastapi uvicorn
```

#### 3.2. Verify Installation
```bash
python3 -c "import supabase; import scipy; import numpy; print('✅ All dependencies installed')"
```

---

### Step 4: Frontend Setup

#### 4.1. Install Node Dependencies
```bash
npm install
```

#### 4.2. Build Frontend
```bash
npm run build
```

**Expected**: No errors, successful build

---

### Step 5: Start Services

#### 5.1. Start Backend (FastAPI)
```bash
# Terminal 1
cd /Users/bahadirgemalmaz/Desktop/WestBetPro
uvicorn api.main:app --reload --port 8000
```

**Expected**: `Application startup complete`

**Verify**:
```bash
curl http://localhost:8000/health
# Expected: {"status": "healthy"}
```

---

#### 5.2. Start Frontend (Next.js)
```bash
# Terminal 2
npm run dev
```

**Expected**: `Ready on http://localhost:3000`

**Verify**: Open browser to `http://localhost:3000`

---

### Step 6: System Verification

#### 6.1. Database Connection Test
```bash
python3 backend/db.py
```

**Expected**: Connection successful message

---

#### 6.2. Admin Login Test
1. Go to `http://localhost:3000`
2. Click "Admin" button in header
3. Login with admin credentials
4. Should redirect to `/admin/dashboard`

---

#### 6.3. Intelligence Output Test
```bash
python3 backend/intelligence_output_manager.py
```

**Expected**: Output emitted successfully with output_id

**Verify in Database**:
```sql
SELECT output_id, title, ui_category, status
FROM intelligence_outputs
ORDER BY created_at DESC
LIMIT 5;
```

---

#### 6.4. Audit Logging Test
```bash
python3 backend/AUDIT_INTEGRATION_EXAMPLE.py
```

**Expected**: Run completed successfully

**Verify in Database**:
```sql
SELECT run_id, status, matches_processed
FROM engine_runs
ORDER BY started_at DESC
LIMIT 5;
```

---

#### 6.5. Sandbox Test
```bash
python3 backend/sandbox_evaluator.py
```

**Expected**: Candidate rule added and tested

**Verify in Database**:
```sql
SELECT candidate_id, rule_name, test_status
FROM candidate_rules
ORDER BY created_at DESC
LIMIT 5;
```

---

### Step 7: Production Configuration

#### 7.1. Environment Variables (Production)
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_API_URL=https://your-production-api.com
```

#### 7.2. Build for Production
```bash
npm run build
npm run start
```

---

## Post-Deployment Verification

### ✅ Core Functionality Checklist

- [ ] Homepage loads and redirects to dashboard
- [ ] Sidebar navigation works
- [ ] Admin login works
- [ ] Admin dashboard accessible
- [ ] Database connections successful
- [ ] RLS policies active
- [ ] All views created successfully

### ✅ System Modules Checklist

- [ ] **Audit Logging**: engine_runs table populated
- [ ] **Learning Engine**: system_suggestions can be created
- [ ] **Sandbox**: candidate_rules can be added and tested
- [ ] **Intelligence Outputs**: Outputs appear in UI
- [ ] **Admin Approval**: State transitions work correctly

### ✅ Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Service role key not exposed to frontend
- [ ] Admin role required for sensitive operations
- [ ] CORS configured correctly
- [ ] API endpoints protected

---

## Common Issues & Solutions

### Issue: "Cannot connect to database"

**Solution**:
1. Check `.env` file has correct credentials
2. Verify Supabase project is active
3. Check network connectivity
4. Verify service role key is correct

```bash
# Test connection
python3 -c "from backend.db import get_client; db = get_client(); print('✅ Connected')"
```

---

### Issue: "RLS policy violation"

**Solution**:
1. Verify user is authenticated
2. Check user has correct role in users table
3. Verify RLS policies deployed correctly

```sql
-- Check RLS policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public';
```

---

### Issue: "Intelligence output blocked"

**Solution**:
1. Check ui_category, ui_priority, required_admin_action are set
2. Verify intelligence_outputs table exists
3. Check system_blocked_events table for reason

```sql
SELECT * FROM system_blocked_events
WHERE resolved = false
ORDER BY blocked_at DESC;
```

---

### Issue: "Frontend not loading"

**Solution**:
1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check port 3000 is not in use: `lsof -ti:3000 | xargs kill -9`
4. Rebuild: `npm run build && npm run dev`

---

## Monitoring & Maintenance

### Daily Checks

1. **System Health**:
```sql
SELECT * FROM system_health_summary;
```

2. **Blocked Events**:
```sql
SELECT COUNT(*) FROM system_blocked_events WHERE resolved = false;
```

3. **Pending Approvals**:
```sql
SELECT COUNT(*) FROM intelligence_outputs WHERE status = 'new';
```

### Weekly Checks

1. **Audit Log Review**:
```sql
SELECT * FROM run_summary
WHERE started_at >= NOW() - INTERVAL '7 days'
ORDER BY started_at DESC;
```

2. **Rule Performance**:
```sql
SELECT * FROM current_rule_performance
WHERE delta_from_baseline < -5;
```

3. **Admin Actions**:
```sql
SELECT * FROM recent_admin_actions
ORDER BY performed_at DESC
LIMIT 50;
```

---

## Rollback Procedure

If deployment fails:

### 1. Database Rollback
```sql
-- Drop new tables (if needed)
DROP TABLE IF EXISTS intelligence_outputs CASCADE;
DROP TABLE IF EXISTS admin_actions_log CASCADE;
-- etc.

-- Restore from backup
-- (Use Supabase Point-in-Time Recovery)
```

### 2. Code Rollback
```bash
# Restore from backup
rm -rf WestBetPro
cp -r WestBetPro_backup_20260206_184021 WestBetPro
cd WestBetPro
npm install
npm run build
```

---

## Success Criteria

Deployment is successful when:

✅ All database tables created (40+ tables)
✅ All views created (10+ views)
✅ Admin user can login
✅ Intelligence outputs visible in UI
✅ Audit logging working
✅ Sandbox testing functional
✅ No blocked events
✅ All RLS policies active
✅ Frontend loads without errors
✅ Backend API responding

---

## Support

For issues:
1. Check logs: `tail -f logs/system.log`
2. Check database: Query system_blocked_events
3. Review documentation:
   - HUMAN_IN_THE_LOOP_SYSTEM.md
   - ADMIN_APPROVAL_SYSTEM.md
   - AUDIT_SYSTEM.md
   - SANDBOX_TESTING.md

---

**Deployment Status**: ✅ Ready
**Last Updated**: February 6, 2026
**Next Review**: 1 week after deployment
