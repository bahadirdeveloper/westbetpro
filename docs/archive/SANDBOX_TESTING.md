# 🧪 Sandbox Testing Environment

**Version**: 1.0.0
**Status**: FROZEN - No Future Enhancements

---

## Overview

The Sandbox Testing Environment allows you to test **candidate rules** on **historical data only** without any impact on the live production system.

---

## Core Principles

### 1. **Isolated Environment**
- ✅ Tests run on READ-ONLY historical data
- ❌ No live data mutation
- ❌ No rule activation in production
- ❌ No system-wide impact

### 2. **Baseline Comparison**
- Compare candidate against:
  - **No rules baseline** (what if we didn't predict?)
  - **Golden rules baseline** (how does it compare to current system?)
  - **Specific rule baseline** (better than rule #X?)

### 3. **Statistical Rigor**
- Minimum 30 predictions for valid test
- P-value < 0.05 for significance
- 95% confidence intervals
- Clear sample size warnings

### 4. **Admin-Only Decisions**
- System generates reports
- Admin reviews recommendations
- Admin manually promotes rules
- NO automatic activation

### 5. **Frozen by Design**
- This module is **COMPLETE**
- No future automation expansion
- No self-learning loops
- No scope creep allowed

---

## Database Schema

### Tables

#### 1. **candidate_rules**
Draft rules being tested (never activated automatically)

```sql
- candidate_id: "CAND-MS-001"
- rule_name, rule_description
- rule_logic: Python or JSON conditions
- prediction_type: "MS 2.5 ÜST", etc.
- confidence_base: 82.0
- test_status: draft | testing | tested | approved | rejected | promoted
```

#### 2. **sandbox_test_runs**
Test execution logs

```sql
- test_run_id: "TEST-20260206-143022"
- candidate_id (FK)
- test_period_start, test_period_end
- baseline_type: no_rules | golden_rules | specific_rule
- total_matches_tested
- candidate_win_rate, baseline_win_rate
- win_rate_delta, p_value, is_significant
- recommendation: approve | reject | needs_tuning | insufficient_data
```

#### 3. **sandbox_match_results**
Per-match test results

```sql
- test_run_id (FK)
- match_id (FK to matches - READ ONLY)
- home_team, away_team, league, match_date
- actual_outcome, actual_scores
- candidate_predicted, candidate_result
- baseline_predicted, baseline_result
```

#### 4. **sandbox_comparison_report**
Aggregate analysis by category

```sql
- test_run_id (FK)
- category: overall | by_league | by_odds_range | by_confidence_bucket
- candidate_metrics, baseline_metrics
- deltas, confidence_intervals
```

### Views

- **candidate_performance_summary**: Performance across all tests
- **test_runs_overview**: Quick test results overview
- **match_comparison_detail**: Match-by-match comparison

---

## Python Implementation

### Add Candidate Rule

```python
from sandbox_evaluator import SandboxEvaluator

sandbox = SandboxEvaluator(db)

sandbox.add_candidate_rule(
    candidate_id="CAND-MS-001",
    rule_name="MS 2.5 Üst - Yüksek Deplasman Oranı",
    rule_description="Predicts MS 2.5 ÜST when away odds >= 2.5",
    rule_logic="JSON conditions",
    rule_type="json_conditions",
    prediction_type="MS 2.5 ÜST",
    confidence_base=82.0,
    conditions={
        "away_odds": {"min": 2.5, "max": 5.0}
    },
    created_by="admin"
)
```

### Test Candidate Rule

```python
result = sandbox.test_candidate_rule(
    candidate_id="CAND-MS-001",
    test_period_days=60,  # Last 60 days of historical data
    baseline_type="golden_rules"  # Compare to current system
)

print(f"Recommendation: {result.recommendation}")
print(f"Win Rate Delta: {result.win_rate_delta:+.2f}%")
print(f"P-value: {result.p_value}")
print(f"Significant: {result.is_significant}")
```

### Generate Report

```python
from sandbox_report_generator import SandboxReportGenerator

reporter = SandboxReportGenerator(db)

report_md = reporter.generate_test_report(test_run_id)

# Save to file
with open(f"test_report_{test_run_id}.md", 'w') as f:
    f.write(report_md)
```

---

## Test Output

### Win/Loss Delta
```
Candidate Win Rate: 78.5%
Baseline Win Rate: 72.3%
Delta: +6.2% (Moderate improvement)
```

### Confidence Change
```
Candidate Avg Confidence: 82.0%
Baseline Avg Confidence: 80.0%
Delta: +2.0%
```

### Volatility Impact
```
Candidate Predictions: 45 matches
Baseline Predictions: 38 matches
Difference: +7 matches (18% increase in coverage)
```

---

## Recommendations

### ✅ APPROVE
- Win rate delta > 5%
- Win rate > 75%
- Statistically significant (p < 0.05)
- Sample size ≥ 30

**Action**: Admin manually promotes to `golden_rules` table

### ❌ REJECT
- Win rate delta ≤ 0%
- OR win rate < 60%
- OR not statistically significant

**Action**: Discard rule, do not promote

### ⚙️ NEEDS TUNING
- Win rate delta > 0% but < 5%
- OR win rate 60-75%
- Shows promise but needs adjustment

**Action**: Modify confidence_base or conditions, retest

### ⚪ INSUFFICIENT DATA
- Sample size < 30 predictions
- Cannot make reliable decision

**Action**: Extend test period or broaden conditions

---

## Example Report

```markdown
# 🧪 Sandbox Test Report

**Test ID**: `TEST-20260206-143022`
**Executed**: 2026-02-06 14:30:22

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| Total Matches Tested | 150 |
| Candidate Predictions | 45 |
| Baseline Predictions | 38 |
| Recommendation | **APPROVE** |

🟢 **READY FOR PRODUCTION**

### Reason
> +6.2% improvement, ready for production

---

## 🏆 Performance Comparison

### Candidate Rule
- Wins: 35
- Losses: 10
- Win Rate: **78.5%**

### Baseline (golden_rules)
- Wins: 27
- Losses: 11
- Win Rate: **72.3%**

### Delta
🟢 **+6.2%** (Moderate improvement)

---

## 📈 Statistical Analysis

- P-value: 0.0234
- Significance: ✅ **Statistically Significant**

---

## ✅ Recommendation: APPROVE

+6.2% improvement, ready for production

### Next Steps
1. Review full test results
2. Validate with domain expert
3. Promote to golden_rules via admin
4. Monitor post-promotion
```

---

## Admin Workflow

### 1. Create Candidate Rule
```bash
python backend/sandbox_evaluator.py
# Follow prompts to define rule
```

### 2. Run Test
```python
sandbox.test_candidate_rule("CAND-MS-001", test_period_days=60)
```

### 3. Review Report
```bash
python backend/sandbox_report_generator.py TEST-20260206-143022
# Opens test_report_TEST-20260206-143022.md
```

### 4. Make Decision

If **APPROVE**:
1. Verify report shows significant improvement
2. Check sample size is sufficient
3. Manually insert into `golden_rules` table:

```sql
INSERT INTO golden_rules (
  rule_code,
  rule_name,
  prediction_type,
  confidence_base,
  conditions,
  success_rate,
  is_active
)
SELECT
  candidate_id,
  rule_name,
  prediction_type,
  confidence_base,
  conditions,
  test_win_rate,
  true
FROM candidate_rules
WHERE candidate_id = 'CAND-MS-001';

-- Update candidate status
UPDATE candidate_rules
SET test_status = 'promoted'
WHERE candidate_id = 'CAND-MS-001';
```

If **REJECT**:
```sql
UPDATE candidate_rules
SET test_status = 'rejected',
    notes = 'Failed testing - does not improve over baseline'
WHERE candidate_id = 'CAND-MS-001';
```

If **NEEDS TUNING**:
1. Adjust `confidence_base` or `conditions`
2. Run new test
3. Re-evaluate

---

## Safety Constraints

### Database Constraints

1. **Historical Data Only**
```sql
ALTER TABLE sandbox_match_results
ADD CONSTRAINT test_only_historical_matches
CHECK (match_date < CURRENT_DATE - INTERVAL '1 day');
```

2. **No Auto-Promotion**
```sql
-- Trigger prevents status change to 'promoted' without 'approved' first
CREATE TRIGGER trg_prevent_auto_promotion ...
```

3. **Read-Only Access**
- Sandbox tables reference `matches` table (FK)
- But NO foreign key to `golden_rules`
- Keeps sandbox completely isolated

### Code Constraints

- No `INSERT` into `golden_rules` from sandbox code
- No `UPDATE` of production `predictions`
- No live system modification
- All reports are static files

---

## Query Examples

### Find Best Performing Candidates
```sql
SELECT *
FROM candidate_performance_summary
WHERE avg_win_rate > 75
  AND times_tested >= 2
ORDER BY avg_delta_vs_baseline DESC;
```

### Review Test History
```sql
SELECT *
FROM test_runs_overview
WHERE executed_at >= NOW() - INTERVAL '30 days'
ORDER BY win_rate_delta DESC;
```

### Match-by-Match Analysis
```sql
SELECT *
FROM match_comparison_detail
WHERE test_run_id = 'TEST-20260206-143022'
  AND comparison = 'candidate_better'
LIMIT 20;
```

### Candidate Rule Status
```sql
SELECT
  candidate_id,
  rule_name,
  test_status,
  test_win_rate,
  last_tested_at
FROM candidate_rules
ORDER BY last_tested_at DESC;
```

---

## Limitations (By Design)

### What This System DOES NOT Do

1. ❌ Automatically activate rules
2. ❌ Modify production golden_rules table
3. ❌ Train machine learning models
4. ❌ Adjust confidence scores automatically
5. ❌ Make decisions without admin approval
6. ❌ Test on future/live data
7. ❌ Impact real predictions
8. ❌ Learn or adapt over time

### What This System DOES Do

1. ✅ Test rules on historical data
2. ✅ Compare against baseline
3. ✅ Calculate statistical significance
4. ✅ Generate human-readable reports
5. ✅ Provide recommendations
6. ✅ Store test results permanently
7. ✅ Enable audit trail
8. ✅ Protect production system

---

## Deployment

### 1. Deploy Schema
```bash
# In Supabase SQL Editor
# Run: database/sandbox_schema.sql
```

### 2. Verify Tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'candidate%' OR table_name LIKE 'sandbox%';
```

### 3. Test Sandbox
```bash
cd /Users/bahadirgemalmaz/Desktop/WestBetPro
python backend/sandbox_evaluator.py
```

### 4. Check RLS Policies
```sql
SELECT *
FROM pg_policies
WHERE tablename IN ('candidate_rules', 'sandbox_test_runs');
```

---

## Troubleshooting

### "Insufficient data" Error

**Cause**: Not enough historical matches in test period

**Fix**:
- Extend test period: `test_period_days=90`
- Broaden rule conditions to match more games
- Wait for more historical data to accumulate

### "Cannot find candidate rule"

**Cause**: `candidate_id` doesn't exist

**Fix**:
```sql
SELECT candidate_id, rule_name FROM candidate_rules;
```

### Test never completes

**Cause**: Large test period or complex conditions

**Fix**:
- Reduce test period
- Check database query performance
- Review logs for errors

---

## FROZEN MODULE NOTICE

⚠️ **This module is FROZEN and COMPLETE.**

No future enhancements will be added:
- ❌ No automatic rule optimization
- ❌ No ML-based tuning
- ❌ No adaptive algorithms
- ❌ No scope expansion

This is intentional to prevent complexity creep.

---

**Status**: ✅ PRODUCTION READY - FROZEN
**Last Updated**: February 6, 2026
