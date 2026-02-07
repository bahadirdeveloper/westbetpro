-- ================================================================
-- INTELLIGENCE OUTPUT SYSTEM
-- UI-First, Human-in-the-Loop Decision Intelligence
--
-- GLOBAL RULE: No backend output without UI destination
-- ================================================================

-- ================================================================
-- 1. INTELLIGENCE OUTPUTS (Central table for ALL system outputs)
-- ================================================================

CREATE TABLE IF NOT EXISTS intelligence_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Output identification
  output_id TEXT UNIQUE NOT NULL, -- e.g., "OUT-20260206-001"
  output_type TEXT NOT NULL CHECK (output_type IN (
    'suggestion',          -- System suggestion for improvement
    'alarm',              -- Critical degradation detected
    'degradation_warning', -- Performance decline
    'insight',            -- Pattern discovered
    'rule_candidate',     -- New rule candidate found
    'confidence_drift',   -- Confidence calibration issue
    'anomaly',            -- Statistical anomaly detected
    'system_event'        -- System status change
  )),

  -- Source tracking
  source_phase TEXT NOT NULL, -- e.g., "Learning Engine", "Sandbox Test", "Execution Engine"
  source_component TEXT,      -- e.g., "rule_degradation_detector", "confidence_calibrator"

  -- ===============================================
  -- MANDATORY UI MAPPING (NON-NEGOTIABLE)
  -- ===============================================

  ui_category TEXT NOT NULL CHECK (ui_category IN (
    'Suggestions',      -- System recommendations
    'Alarms',          -- Critical issues requiring immediate attention
    'Rule Health',     -- Rule performance insights
    'Sandbox Results', -- Test results from sandbox
    'System Logs'      -- System events and status
  )),

  ui_priority TEXT NOT NULL CHECK (ui_priority IN (
    'low',      -- Informational
    'medium',   -- Review recommended
    'high',     -- Action advised
    'critical'  -- Immediate attention required
  )),

  required_admin_action TEXT NOT NULL CHECK (required_admin_action IN (
    'view',     -- Just needs to be seen
    'review',   -- Needs evaluation
    'approve',  -- Requires approval to proceed
    'reject',   -- Requires rejection decision
    'archive'   -- Needs archival decision
  )),

  -- Title and content
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Structured payload (detailed data)
  payload JSONB NOT NULL,
  /*
  Example payload structure:
  {
    "rule_id": 42,
    "current_win_rate": 74.2,
    "baseline_win_rate": 82.0,
    "delta": -7.8,
    "sample_size": 60,
    "confidence_interval": [68.5, 79.9],
    "p_value": 0.0234,
    "recommended_actions": [
      "Lower confidence_base by 5-8 points",
      "Add league filter",
      "Disable temporarily"
    ]
  }
  */

  -- Advisory language (never commanding)
  advisory_text TEXT, -- e.g., "Observed pattern suggests reducing confidence"

  -- ===============================================
  -- LIFECYCLE STATE MACHINE
  -- ===============================================

  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',       -- Just created, awaiting review
    'reviewed',  -- Admin has seen it
    'approved',  -- Admin approved action
    'rejected',  -- Admin rejected recommendation
    'archived',  -- Kept for history, not active
    'executed'   -- Action was taken (if applicable)
  )),

  -- Admin interaction tracking
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT, -- Admin email
  admin_notes TEXT, -- Admin's comments

  approval_details JSONB, -- What exactly was approved
  action_taken TEXT,      -- What action admin performed

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiry for time-sensitive outputs

  -- Visibility flags
  is_dismissed BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,

  -- Traceability
  related_run_id TEXT,           -- Link to engine_runs if applicable
  related_rule_id INTEGER,        -- Link to golden_rules if applicable
  related_test_id TEXT,           -- Link to sandbox test if applicable

  CONSTRAINT valid_review CHECK (
    (status != 'reviewed' AND reviewed_at IS NULL) OR
    (status = 'reviewed' AND reviewed_at IS NOT NULL)
  ),

  CONSTRAINT valid_approval CHECK (
    (status != 'approved' AND approval_details IS NULL) OR
    (status = 'approved' AND approval_details IS NOT NULL)
  )
);

CREATE INDEX idx_intelligence_status ON intelligence_outputs(status);
CREATE INDEX idx_intelligence_category ON intelligence_outputs(ui_category);
CREATE INDEX idx_intelligence_priority ON intelligence_outputs(ui_priority);
CREATE INDEX idx_intelligence_created ON intelligence_outputs(created_at DESC);
CREATE INDEX idx_intelligence_type ON intelligence_outputs(output_type);

-- ================================================================
-- 2. ADMIN ACTIONS LOG (Audit trail of admin decisions)
-- ================================================================

CREATE TABLE IF NOT EXISTS admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Action identification
  action_id TEXT UNIQUE NOT NULL, -- e.g., "ACT-20260206-001"

  -- Link to intelligence output
  output_id TEXT REFERENCES intelligence_outputs(output_id) ON DELETE SET NULL,

  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN (
    'viewed',
    'reviewed',
    'approved',
    'rejected',
    'dismissed',
    'archived',
    'executed',
    'modified'
  )),

  -- Who and when
  admin_email TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- What was done
  action_details JSONB NOT NULL,
  /*
  Example:
  {
    "decision": "approved",
    "changes_made": {
      "confidence_base": {"old": 82, "new": 75}
    },
    "reason": "Significant degradation confirmed"
  }
  */

  -- Admin notes
  notes TEXT
);

CREATE INDEX idx_admin_actions_output ON admin_actions_log(output_id);
CREATE INDEX idx_admin_actions_admin ON admin_actions_log(admin_email);
CREATE INDEX idx_admin_actions_performed ON admin_actions_log(performed_at DESC);

-- ================================================================
-- 3. UI DISPLAY QUEUE (Active items for admin dashboard)
-- ================================================================

CREATE TABLE IF NOT EXISTS ui_display_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to intelligence output
  output_id TEXT NOT NULL REFERENCES intelligence_outputs(output_id) ON DELETE CASCADE,

  -- Display configuration
  display_section TEXT NOT NULL CHECK (display_section IN (
    'urgent_alerts',        -- Top of dashboard
    'pending_reviews',      -- Needs attention
    'recent_insights',      -- Informational
    'active_suggestions',   -- Actionable items
    'system_status'         -- Health indicators
  )),

  display_priority INTEGER NOT NULL DEFAULT 0, -- Higher = shown first

  -- Visibility
  is_visible BOOLEAN DEFAULT true,
  display_until TIMESTAMPTZ, -- Auto-hide after this time

  -- Timestamps
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ
);

CREATE INDEX idx_ui_queue_section ON ui_display_queue(display_section);
CREATE INDEX idx_ui_queue_priority ON ui_display_queue(display_priority DESC);
CREATE INDEX idx_ui_queue_visible ON ui_display_queue(is_visible);

-- ================================================================
-- 4. SYSTEM BLOCKED EVENTS (Failsafe violations)
-- ================================================================

CREATE TABLE IF NOT EXISTS system_blocked_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identification
  event_id TEXT UNIQUE NOT NULL, -- e.g., "BLOCK-20260206-001"

  -- What was blocked
  blocked_operation TEXT NOT NULL,
  block_reason TEXT NOT NULL CHECK (block_reason IN (
    'missing_ui_mapping',      -- ui_category/priority not set
    'persistence_failed',      -- Database write failed
    'admin_approval_absent',   -- Action requires approval
    'invalid_lifecycle_state', -- Wrong status transition
    'source_unknown',          -- Source not recognized
    'payload_invalid'          -- Malformed data
  )),

  -- Context
  attempted_payload JSONB,
  error_message TEXT,

  -- System state
  system_phase TEXT,
  component_name TEXT,

  -- Timestamp
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX idx_blocked_events_blocked ON system_blocked_events(blocked_at DESC);
CREATE INDEX idx_blocked_events_resolved ON system_blocked_events(resolved);

-- ================================================================
-- 5. VIEWS FOR ADMIN UI
-- ================================================================

-- 5.1 Urgent Items (Critical priority, new status)
CREATE OR REPLACE VIEW urgent_admin_items AS
SELECT
  io.output_id,
  io.title,
  io.description,
  io.ui_category,
  io.ui_priority,
  io.required_admin_action,
  io.created_at,
  io.payload
FROM intelligence_outputs io
WHERE io.status = 'new'
  AND io.ui_priority IN ('high', 'critical')
  AND io.is_dismissed = false
ORDER BY
  CASE io.ui_priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
  END,
  io.created_at ASC;

-- 5.2 Pending Reviews (Awaiting admin decision)
CREATE OR REPLACE VIEW pending_admin_reviews AS
SELECT
  io.output_id,
  io.title,
  io.ui_category,
  io.required_admin_action,
  io.created_at,
  EXTRACT(EPOCH FROM (NOW() - io.created_at)) / 3600 as hours_pending
FROM intelligence_outputs io
WHERE io.status IN ('new', 'reviewed')
  AND io.required_admin_action IN ('review', 'approve', 'reject')
  AND io.is_dismissed = false
ORDER BY io.ui_priority DESC, io.created_at ASC;

-- 5.3 Recent Admin Actions (Last 7 days)
CREATE OR REPLACE VIEW recent_admin_actions AS
SELECT
  aal.action_id,
  aal.action_type,
  aal.admin_email,
  aal.performed_at,
  io.title as related_output_title,
  io.ui_category
FROM admin_actions_log aal
LEFT JOIN intelligence_outputs io ON io.output_id = aal.output_id
WHERE aal.performed_at >= NOW() - INTERVAL '7 days'
ORDER BY aal.performed_at DESC
LIMIT 50;

-- 5.4 System Health Summary
CREATE OR REPLACE VIEW system_health_summary AS
SELECT
  COUNT(*) FILTER (WHERE ui_priority = 'critical') as critical_items,
  COUNT(*) FILTER (WHERE ui_priority = 'high') as high_priority_items,
  COUNT(*) FILTER (WHERE status = 'new') as new_items,
  COUNT(*) FILTER (WHERE required_admin_action = 'approve') as awaiting_approval,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h_items
FROM intelligence_outputs
WHERE is_dismissed = false;

-- 5.5 Blocked Operations (Needs admin attention)
CREATE OR REPLACE VIEW active_blocked_events AS
SELECT
  event_id,
  blocked_operation,
  block_reason,
  error_message,
  blocked_at
FROM system_blocked_events
WHERE resolved = false
ORDER BY blocked_at DESC;

-- ================================================================
-- 6. RLS POLICIES
-- ================================================================

ALTER TABLE intelligence_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_display_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_blocked_events ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated (admin users)
CREATE POLICY "Enable read for authenticated" ON intelligence_outputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON admin_actions_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON ui_display_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated" ON system_blocked_events FOR SELECT TO authenticated USING (true);

-- Write access for service role (backend)
CREATE POLICY "Enable insert for service" ON intelligence_outputs FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable update for service" ON intelligence_outputs FOR UPDATE TO service_role USING (true);
CREATE POLICY "Enable insert for service" ON admin_actions_log FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable insert for service" ON ui_display_queue FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Enable insert for service" ON system_blocked_events FOR INSERT TO service_role WITH CHECK (true);

-- Admin can update intelligence_outputs status
CREATE POLICY "Enable update for authenticated" ON intelligence_outputs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable update for authenticated" ON system_blocked_events FOR UPDATE TO authenticated USING (true);

-- ================================================================
-- 7. TRIGGERS
-- ================================================================

-- 7.1 Auto-add to UI queue on creation
CREATE OR REPLACE FUNCTION auto_add_to_ui_queue()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine display section
  DECLARE
    display_section TEXT;
    display_priority INT;
  BEGIN
    IF NEW.ui_priority = 'critical' THEN
      display_section := 'urgent_alerts';
      display_priority := 100;
    ELSIF NEW.required_admin_action = 'approve' THEN
      display_section := 'pending_reviews';
      display_priority := 50;
    ELSIF NEW.ui_category = 'Suggestions' THEN
      display_section := 'active_suggestions';
      display_priority := 30;
    ELSIF NEW.ui_category = 'System Logs' THEN
      display_section := 'system_status';
      display_priority := 10;
    ELSE
      display_section := 'recent_insights';
      display_priority := 20;
    END IF;

    -- Insert into UI queue
    INSERT INTO ui_display_queue (
      output_id,
      display_section,
      display_priority,
      is_visible
    ) VALUES (
      NEW.output_id,
      display_section,
      display_priority,
      true
    );

    RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_add_to_ui_queue
AFTER INSERT ON intelligence_outputs
FOR EACH ROW
EXECUTE FUNCTION auto_add_to_ui_queue();

-- 7.2 Log admin actions on status change
CREATE OR REPLACE FUNCTION log_admin_action_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO admin_actions_log (
      action_id,
      output_id,
      action_type,
      admin_email,
      action_details,
      notes
    ) VALUES (
      'ACT-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
      NEW.output_id,
      NEW.status,
      NEW.reviewed_by,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'approval_details', NEW.approval_details
      ),
      NEW.admin_notes
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_admin_action
AFTER UPDATE ON intelligence_outputs
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION log_admin_action_on_status_change();

-- ================================================================
-- SUCCESS!
-- UI-First Intelligence System Ready
-- NO SILENT OUTPUTS - Every output has UI destination
-- HUMAN AUTHORITY - All decisions require admin approval
-- COMPLETE TRACEABILITY - Full audit trail
-- ================================================================
