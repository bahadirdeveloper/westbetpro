# 🎯 Human-in-the-Loop Decision Intelligence System

**Version**: 1.0.0
**Status**: PRODUCTION READY
**Philosophy**: UI-First, Human-Authority, Zero Silent Outputs

---

## Primary Principle (NON-NEGOTIABLE)

> **Any backend-generated output that does NOT have a UI destination is considered INVALID and must NOT be produced.**

---

## System Goal

Ensure that every observation, suggestion, alarm, rule insight, or anomaly discovered by the system is:

1. ✅ **Persisted** (to database)
2. ✅ **Visible to admin** (in UI)
3. ✅ **Actionable** (admin can act on it)
4. ✅ **Traceable historically** (full audit trail)

---

## Global Hard Rules

### 1. NO SILENT OUTPUTS

❌ **Forbidden**:
- Console-only logs
- Ephemeral suggestions
- Auto-decisions
- Background-only intelligence

✅ **Required**:
- Every output must have UI destination
- If it cannot be reviewed by a human, it must not exist

### 2. UI-FIRST THINKING

Before generating any output, backend logic MUST answer:
- "Where will this appear in the admin UI?"
- "What decision will a human make on this?"

If the answer is unclear → **abort generation**.

### 3. HUMAN AUTHORITY

The system may:
- ✅ Observe
- ✅ Measure
- ✅ Suggest
- ✅ Warn

The system may NOT:
- ❌ Modify rules
- ❌ Activate strategies
- ❌ Deactivate rules
- ❌ Change thresholds

...unless **explicitly approved by an admin**.

---

## Mandatory UI Mapping

Every backend output MUST declare:

```python
ui_category: UICategory  # WHERE it appears
# Options: Suggestions | Alarms | Rule Health | Sandbox Results | System Logs

ui_priority: UIPriority  # HOW urgent
# Options: low | medium | high | critical

required_admin_action: RequiredAction  # WHAT admin must do
# Options: view | review | approve | reject | archive
```

**FAIL CONDITION**: If any of these fields are missing → do not emit the output.

---

## Persistence Contract

All outputs must be written to persistent store **before** any other processing.

### Required Record Structure

```sql
CREATE TABLE intelligence_outputs (
  id UUID PRIMARY KEY,
  output_id TEXT UNIQUE NOT NULL,

  -- Type & Source
  output_type TEXT NOT NULL,  -- suggestion | alarm | insight | etc.
  source_phase TEXT NOT NULL, -- e.g., "Learning Engine"
  source_component TEXT,       -- e.g., "rule_degradation_detector"

  -- UI MAPPING (MANDATORY)
  ui_category TEXT NOT NULL,
  ui_priority TEXT NOT NULL,
  required_admin_action TEXT NOT NULL,

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  payload JSONB NOT NULL,
  advisory_text TEXT,  -- Never commanding, always advisory

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'new',
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  admin_notes TEXT,

  -- Traceability
  related_run_id TEXT,
  related_rule_id INTEGER,
  related_test_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**No in-memory-only objects allowed.**

---

## Lifecycle State Machine

Every record follows this lifecycle **strictly**:

```
CREATED (new)
    ↓
REVIEWED (reviewed)
    ↓
APPROVED | REJECTED | ARCHIVED
    ↓
EXECUTED (if applicable)
    ↓
ARCHIVED
```

### Rules

- **APPROVED** → may influence live system
- **REJECTED** → never reused, kept for audit
- **ARCHIVED** → kept for learning, never executed
- **EXECUTED** → action was taken, now archived

### Valid Transitions

```python
NEW → REVIEWED
REVIEWED → APPROVED | REJECTED | ARCHIVED
APPROVED → EXECUTED | ARCHIVED
REJECTED → ARCHIVED
EXECUTED → ARCHIVED
```

Backend MUST check status before acting.

---

## Rule Discovery Safety (READ-ONLY)

Discovered patterns or rule candidates:
- ✅ Must be tagged as **READ-ONLY**
- ❌ Must NOT override existing rules
- ✅ Must be presented as **recommendations only**

### Language Guidelines

❌ **Commanding**: "Replace rule X"
✅ **Advisory**: "Observed pattern suggests considering..."

❌ **Automatic**: "Rule has been adjusted"
✅ **Suggestive**: "Data indicates adjustment may improve..."

---

## Admin Panel as Source of Truth

**The admin UI is the single authority.**

- ❌ Backend assumptions are forbidden
- ❌ If admin intent is unknown → do nothing
- ✅ All decisions flow through UI approval
- ✅ System waits for explicit admin action

---

## Failsafe Protocol

If ANY of these conditions are met:

- ❌ UI mapping is missing
- ❌ Persistence fails
- ❌ Admin approval is absent (when required)

THEN:

1. ✅ **Abort execution safely**
2. ✅ **Log as SYSTEM BLOCKED EVENT**
3. ✅ **Make event visible in admin UI**

### Blocked Events Table

```sql
CREATE TABLE system_blocked_events (
  event_id TEXT UNIQUE NOT NULL,
  blocked_operation TEXT NOT NULL,
  block_reason TEXT NOT NULL,  -- missing_ui_mapping | persistence_failed | etc.
  attempted_payload JSONB,
  error_message TEXT,
  system_phase TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false
);
```

Admin can see all blocked operations in UI.

---

## Implementation (Python)

### Emit Intelligence Output

```python
from intelligence_output_manager import (
    IntelligenceOutputManager,
    create_suggestion_output,
    UIPriority
)

manager = IntelligenceOutputManager(db)

# Create suggestion
suggestion = create_suggestion_output(
    title="Rule #42 Degradation Detected",
    description="Rule #42 dropped to 74% (baseline: 82%)",
    recommendation="Consider reducing confidence_base by 5-8 points",
    justification="8% drop is statistically significant (p < 0.05)",
    source_phase="Learning Engine",
    source_component="rule_degradation_detector",
    priority=UIPriority.HIGH,
    related_rule_id=42,
    extra_payload={
        "current_win_rate": 74.0,
        "baseline_win_rate": 82.0,
        "delta": -8.0,
        "sample_size": 60
    }
)

# Emit (with failsafe)
output_id = manager.emit_output(suggestion)

if output_id:
    # Success - now visible in admin UI
    print(f"✅ Output visible at: /admin/intelligence/{output_id}")
else:
    # BLOCKED - check system_blocked_events
    print("❌ Output was blocked (UI mapping missing or persistence failed)")
```

### Validation

System automatically validates:

1. **UI Mapping Present?**
   - ui_category must be UICategory enum
   - ui_priority must be UIPriority enum
   - required_admin_action must be RequiredAction enum

2. **Payload Valid?**
   - Must be dict
   - Required fields present based on output_type

3. **Persistence Successful?**
   - Database INSERT must succeed
   - If fails → log to system_blocked_events

### Blocked Event Example

```python
# If validation fails, system automatically logs:
{
  "event_id": "BLOCK-20260206-143022",
  "blocked_operation": "emit_suggestion",
  "block_reason": "missing_ui_mapping",
  "attempted_payload": {...},
  "error_message": "ui_category must be UICategory enum",
  "system_phase": "Learning Engine",
  "blocked_at": "2026-02-06T14:30:22Z"
}
```

Admin sees this in: `/admin/blocked-events`

---

## Admin UI Integration

### Intelligence Dashboard

```
/admin/intelligence

Sections:
- Urgent Alerts (critical priority)
- Pending Reviews (awaiting decision)
- Recent Insights (informational)
- Active Suggestions (actionable)
- System Status (health)
```

### Admin Actions

1. **View** - Mark as seen
2. **Review** - Evaluate details
3. **Approve** - Accept recommendation
4. **Reject** - Decline recommendation
5. **Archive** - Store for history

### Views Available

```sql
-- Urgent items (critical, needs attention)
SELECT * FROM urgent_admin_items;

-- Pending reviews
SELECT * FROM pending_admin_reviews;

-- Recent admin actions (audit trail)
SELECT * FROM recent_admin_actions;

-- System health summary
SELECT * FROM system_health_summary;

-- Blocked operations
SELECT * FROM active_blocked_events;
```

---

## Output Types

### 1. Suggestion
```python
{
  "output_type": "suggestion",
  "ui_category": "Suggestions",
  "title": "Rule Performance Improvement",
  "description": "Rule #X shows degradation...",
  "payload": {
    "recommendation": "Lower confidence by 5 points",
    "justification": "Statistically significant decline",
    "suggested_actions": [...]
  }
}
```

### 2. Alarm
```python
{
  "output_type": "alarm",
  "ui_category": "Alarms",
  "ui_priority": "critical",
  "title": "Critical System Issue",
  "description": "Database connection failing...",
  "payload": {
    "severity": "critical",
    "issue": "Connection timeout",
    "immediate_action_required": true
  }
}
```

### 3. Degradation Warning
```python
{
  "output_type": "degradation_warning",
  "ui_category": "Rule Health",
  "title": "Rule #42 Performance Decline",
  "payload": {
    "current_performance": 74.0,
    "baseline_performance": 82.0,
    "delta": -8.0,
    "trend": "declining"
  }
}
```

### 4. Insight
```python
{
  "output_type": "insight",
  "ui_category": "Rule Health",
  "title": "Pattern Discovered in League X",
  "advisory_text": "Observed pattern suggests evening matches perform better"
}
```

### 5. Rule Candidate
```python
{
  "output_type": "rule_candidate",
  "ui_category": "Sandbox Results",
  "title": "New Rule Candidate: MS 2.5 ÜST - High Away Odds",
  "required_admin_action": "approve",
  "payload": {
    "test_win_rate": 82.5,
    "baseline_win_rate": 75.0,
    "delta": +7.5,
    "sample_size": 60,
    "recommendation": "approve"
  }
}
```

---

## Integration with Existing Systems

### Learning Engine Integration

```python
from learning_engine import LearningEngine
from intelligence_output_manager import IntelligenceOutputManager, create_suggestion_output, UIPriority

learning_engine = LearningEngine(db)
output_manager = IntelligenceOutputManager(db)

# Analyze rule performance
performances = learning_engine.analyze_rule_performance(days=30)

for perf in performances:
    if perf.delta < -5 and perf.is_significant:
        # Generate suggestion (with UI mapping)
        suggestion = create_suggestion_output(
            title=f"Rule {perf.rule_code} Degradation",
            description=f"Dropped to {perf.success_rate}% (baseline: {perf.baseline_success_rate}%)",
            recommendation=f"Lower confidence_base by {abs(int(perf.delta * 0.8))} points",
            justification=f"{abs(perf.delta):.1f}% decline (p={perf.p_value:.4f})",
            source_phase="Learning Engine",
            priority=UIPriority.HIGH,
            related_rule_id=perf.rule_id
        )

        # Emit (with failsafe)
        output_id = output_manager.emit_output(suggestion)

        # NO AUTO-APPLY - wait for admin approval
```

### Sandbox Test Integration

```python
from sandbox_evaluator import SandboxEvaluator
from intelligence_output_manager import IntelligenceOutputManager, IntelligenceOutput, OutputType, UICategory, UIPriority, RequiredAction

sandbox = SandboxEvaluator(db)
output_manager = IntelligenceOutputManager(db)

# Test candidate rule
result = sandbox.test_candidate_rule("CAND-MS-001")

# Present result to admin (with UI mapping)
output = IntelligenceOutput(
    output_type=OutputType.RULE_CANDIDATE,
    source_phase="Sandbox Test",
    ui_category=UICategory.SANDBOX_RESULTS,
    ui_priority=UIPriority.MEDIUM if result.recommendation == "approve" else UIPriority.LOW,
    required_admin_action=RequiredAction.APPROVE if result.recommendation == "approve" else RequiredAction.REVIEW,
    title=f"Test Result: {result.test_run_id}",
    description=f"Candidate rule tested. Win rate: {result.candidate_win_rate}%, Delta: {result.win_rate_delta:+.1f}%",
    payload={
        "test_run_id": result.test_run_id,
        "recommendation": result.recommendation,
        "win_rate_delta": result.win_rate_delta,
        "is_significant": result.is_significant
    },
    advisory_text=f"Test suggests: {result.recommendation_reason}",
    related_test_id=result.test_run_id
)

output_manager.emit_output(output)

# NO AUTO-PROMOTION - wait for admin approval
```

---

## Admin Workflow Example

### Scenario: Rule Degradation Detected

1. **Backend** detects Rule #42 degradation
2. **System** creates intelligence_output:
   ```json
   {
     "output_id": "OUT-20260206-001",
     "output_type": "degradation_warning",
     "ui_category": "Rule Health",
     "ui_priority": "high",
     "required_admin_action": "review",
     "title": "Rule #42 Degradation",
     "status": "new"
   }
   ```
3. **Admin UI** shows in "Pending Reviews" section
4. **Admin** clicks "Review" → status: "reviewed"
5. **Admin** evaluates data, decides to approve
6. **Admin** clicks "Approve" → status: "approved"
7. **Admin** manually edits `golden_rules.py`:
   ```python
   confidence_base = 75  # was 82
   ```
8. **System** logs admin action:
   ```json
   {
     "action_type": "executed",
     "admin_email": "admin@westbetpro.com",
     "action_details": {
       "confidence_base": {"old": 82, "new": 75}
     }
   }
   ```
9. **Output** updated: status: "executed"

---

## End Condition

The system is considered correct only if:

- ✅ **Every intelligence artifact is visible** (in admin UI)
- ✅ **Every decision is human-approved** (no auto-decisions)
- ✅ **Every action is traceable** (full audit trail)

You are not building an autonomous AI.
**You are building a decision intelligence system.**

---

## Deployment Checklist

### Database

- [ ] Deploy `intelligence_output_schema.sql` to Supabase
- [ ] Verify all tables created
- [ ] Check RLS policies active
- [ ] Test views working

### Backend

- [ ] Import `intelligence_output_manager.py` in all components
- [ ] Replace console logs with `emit_output()`
- [ ] Remove all auto-decision code
- [ ] Add failsafe checks

### Admin UI

- [ ] Create `/admin/intelligence` page
- [ ] Display urgent_admin_items
- [ ] Display pending_admin_reviews
- [ ] Add action buttons (approve/reject/archive)
- [ ] Show system_blocked_events
- [ ] Add admin action logging

### Testing

- [ ] Emit test suggestion
- [ ] Verify appears in admin UI
- [ ] Test approve workflow
- [ ] Test reject workflow
- [ ] Verify audit trail complete
- [ ] Test blocked event logging

---

**Status**: ✅ PRODUCTION READY
**Last Updated**: February 6, 2026

---

*"The system provides intelligence. Humans provide judgment."*
