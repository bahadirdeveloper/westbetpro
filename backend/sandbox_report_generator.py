"""
Sandbox Report Generator
Generates static, read-only reports for rule testing results
"""

import logging
from datetime import datetime
from typing import Dict, List
import json

logger = logging.getLogger(__name__)


class SandboxReportGenerator:
    """
    Generate human-readable reports for sandbox test results
    NO AUTOMATIC DECISIONS - Reports for admin review only
    """

    def __init__(self, db_client):
        self.db = db_client

    # ================================================================
    # MAIN REPORT GENERATION
    # ================================================================

    def generate_test_report(self, test_run_id: str) -> str:
        """
        Generate comprehensive test report in Markdown format
        Returns: Markdown string
        """
        # Fetch test run
        test_run = self._fetch_test_run(test_run_id)
        if not test_run:
            return f"❌ Test run {test_run_id} not found"

        # Fetch candidate rule
        candidate = self._fetch_candidate(test_run['candidate_id'])

        # Fetch match results
        match_results = self._fetch_match_results(test_run_id)

        # Generate report sections
        report = []
        report.append(self._generate_header(test_run, candidate))
        report.append(self._generate_summary(test_run))
        report.append(self._generate_performance_comparison(test_run))
        report.append(self._generate_statistical_analysis(test_run))
        report.append(self._generate_match_breakdown(match_results))
        report.append(self._generate_recommendation(test_run))
        report.append(self._generate_warnings(test_run))

        return "\n\n".join(report)

    # ================================================================
    # REPORT SECTIONS
    # ================================================================

    def _generate_header(self, test_run: Dict, candidate: Dict) -> str:
        """Generate report header"""
        return f"""# 🧪 Sandbox Test Report

**Test ID**: `{test_run['test_run_id']}`
**Test Name**: {test_run['test_name']}
**Executed**: {test_run['executed_at'][:19]}
**Status**: {test_run['status'].upper()}

---

## Candidate Rule

**ID**: `{candidate['candidate_id']}`
**Name**: {candidate['rule_name']}
**Description**: {candidate['rule_description']}
**Prediction Type**: {candidate['prediction_type']}
**Confidence Base**: {candidate['confidence_base']}%

**Test Period**: {test_run['test_period_start']} to {test_run['test_period_end']}
**Baseline**: {test_run['baseline_type'].replace('_', ' ').title()}
"""

    def _generate_summary(self, test_run: Dict) -> str:
        """Generate executive summary"""
        return f"""---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Matches Tested** | {test_run['total_matches_tested']} |
| **Candidate Predictions** | {test_run['candidate_predictions_count']} |
| **Baseline Predictions** | {test_run['baseline_predictions_count'] or 'N/A'} |
| **Recommendation** | **{test_run['recommendation'].upper()}** |

{self._format_recommendation_badge(test_run['recommendation'])}

### Reason
> {test_run['recommendation_reason']}
"""

    def _generate_performance_comparison(self, test_run: Dict) -> str:
        """Generate performance comparison section"""
        candidate_wr = test_run['candidate_win_rate'] or 0
        baseline_wr = test_run['baseline_win_rate'] or 0
        delta = test_run['win_rate_delta'] or 0

        delta_symbol = "🟢" if delta > 0 else "🔴" if delta < 0 else "⚪"
        delta_text = f"+{delta:.1f}%" if delta > 0 else f"{delta:.1f}%"

        return f"""---

## 🏆 Performance Comparison

### Candidate Rule
- **Predictions Made**: {test_run['candidate_predictions_count']}
- **Wins**: {test_run['candidate_win_count']}
- **Losses**: {test_run['candidate_loss_count']}
- **Win Rate**: **{candidate_wr:.1f}%**

### Baseline ({test_run['baseline_type']})
- **Predictions Made**: {test_run['baseline_predictions_count'] or 0}
- **Wins**: {test_run['baseline_win_count'] or 0}
- **Losses**: {test_run['baseline_loss_count'] or 0}
- **Win Rate**: **{baseline_wr:.1f}%**

### Delta
{delta_symbol} **{delta_text}** ({self._interpret_delta(delta)})
"""

    def _generate_statistical_analysis(self, test_run: Dict) -> str:
        """Generate statistical significance section"""
        p_value = test_run['p_value'] or 1.0
        is_sig = test_run['is_significant']

        significance_text = "✅ **Statistically Significant**" if is_sig else "⚠️ **Not Statistically Significant**"

        sample_warning = ""
        if test_run['candidate_predictions_count'] < 30:
            sample_warning = "\n\n⚠️ **WARNING**: Sample size below 30 predictions. Results may not be reliable."

        return f"""---

## 📈 Statistical Analysis

- **P-value**: {p_value:.4f}
- **Significance Level**: α = 0.05
- **Result**: {significance_text}

### Interpretation
{self._interpret_p_value(p_value, is_sig)}
{sample_warning}
"""

    def _generate_match_breakdown(self, match_results: List[Dict]) -> str:
        """Generate match-by-match breakdown"""
        if not match_results:
            return "---\n\n## 📋 Match Breakdown\n\nNo match results available."

        # Count result types
        both_won = sum(1 for m in match_results if m.get('candidate_result') == 'won' and m.get('baseline_result') == 'won')
        only_cand = sum(1 for m in match_results if m.get('candidate_result') == 'won' and m.get('baseline_result') != 'won')
        only_base = sum(1 for m in match_results if m.get('baseline_result') == 'won' and m.get('candidate_result') != 'won')
        both_lost = sum(1 for m in match_results if m.get('candidate_result') == 'lost' and m.get('baseline_result') == 'lost')

        # Sample matches (first 10)
        sample_table = "| Match | Date | Candidate | Baseline | Winner |\n"
        sample_table += "|-------|------|-----------|----------|--------|\n"

        for match in match_results[:10]:
            home = match['home_team'][:15]
            away = match['away_team'][:15]
            date = match['match_date']
            cand = "✅" if match.get('candidate_result') == 'won' else "❌" if match.get('candidate_result') == 'lost' else "➖"
            base = "✅" if match.get('baseline_result') == 'won' else "❌" if match.get('baseline_result') == 'lost' else "➖"

            if match.get('candidate_result') == 'won' and match.get('baseline_result') != 'won':
                winner = "🟢 Candidate"
            elif match.get('baseline_result') == 'won' and match.get('candidate_result') != 'won':
                winner = "🔴 Baseline"
            else:
                winner = "⚪ Tie"

            sample_table += f"| {home} vs {away} | {date} | {cand} | {base} | {winner} |\n"

        return f"""---

## 📋 Match Breakdown

### Result Distribution
- Both Won: {both_won}
- Only Candidate Won: {only_cand} 🟢
- Only Baseline Won: {only_base} 🔴
- Both Lost: {both_lost}

### Sample Matches (First 10)
{sample_table}

*Full results stored in database: `sandbox_match_results` table*
"""

    def _generate_recommendation(self, test_run: Dict) -> str:
        """Generate detailed recommendation"""
        rec = test_run['recommendation']

        if rec == 'approve':
            return f"""---

## ✅ Recommendation: APPROVE

{test_run['recommendation_reason']}

### Next Steps
1. Review full test results in database
2. Validate rule logic with domain expert
3. Consider adding to golden rules via admin panel
4. Monitor performance after promotion

**Admin Action Required**: Manual promotion to `golden_rules` table
"""

        elif rec == 'reject':
            return f"""---

## ❌ Recommendation: REJECT

{test_run['recommendation_reason']}

### Next Steps
1. Analyze why rule underperformed
2. Consider adjusting conditions or confidence
3. Run new test with modified rule
4. Discard if no improvement path

**Admin Action**: Mark rule as rejected, do not promote
"""

        elif rec == 'needs_tuning':
            return f"""---

## ⚙️ Recommendation: NEEDS TUNING

{test_run['recommendation_reason']}

### Next Steps
1. Adjust confidence base (consider reducing by 5-10 points)
2. Refine rule conditions (odds range, league filters)
3. Run new test with adjusted parameters
4. Re-evaluate after tuning

**Admin Action**: Modify rule and retest before promotion
"""

        else:  # insufficient_data
            return f"""---

## ⚠️ Recommendation: INSUFFICIENT DATA

{test_run['recommendation_reason']}

### Next Steps
1. Extend test period (try 90 days instead of 60)
2. Broaden rule conditions to match more games
3. Wait for more historical data to accumulate
4. Cannot make promotion decision yet

**Admin Action**: Extend test period and retry
"""

    def _generate_warnings(self, test_run: Dict) -> str:
        """Generate warnings section"""
        warnings = []

        # Sample size warning
        if test_run['candidate_predictions_count'] < 30:
            warnings.append("⚠️ **Small Sample Size**: Less than 30 predictions. Results may not be reliable.")

        # No baseline comparison
        if test_run['baseline_predictions_count'] == 0:
            warnings.append("⚠️ **No Baseline Data**: Unable to compare against existing system.")

        # Very low win rate
        if test_run['candidate_win_rate'] and test_run['candidate_win_rate'] < 60:
            warnings.append(f"⚠️ **Low Win Rate**: {test_run['candidate_win_rate']:.1f}% is below acceptable threshold (60%+).")

        # Not significant
        if not test_run['is_significant']:
            warnings.append("⚠️ **Not Significant**: Results could be due to chance. Do not rely on this test.")

        if not warnings:
            return ""

        return f"""---

## ⚠️ Warnings

{chr(10).join(warnings)}
"""

    # ================================================================
    # HELPER METHODS
    # ================================================================

    def _fetch_test_run(self, test_run_id: str) -> Optional[Dict]:
        """Fetch test run from database"""
        result = self.db.client.table('sandbox_test_runs').select('*').eq(
            'test_run_id', test_run_id
        ).execute()

        return result.data[0] if result.data else None

    def _fetch_candidate(self, candidate_id: str) -> Optional[Dict]:
        """Fetch candidate rule"""
        result = self.db.client.table('candidate_rules').select('*').eq(
            'candidate_id', candidate_id
        ).execute()

        return result.data[0] if result.data else None

    def _fetch_match_results(self, test_run_id: str) -> List[Dict]:
        """Fetch match results"""
        result = self.db.client.table('sandbox_match_results').select('*').eq(
            'test_run_id', test_run_id
        ).order('match_date', desc=True).execute()

        return result.data

    def _format_recommendation_badge(self, recommendation: str) -> str:
        """Format recommendation as badge"""
        badges = {
            'approve': '🟢 **READY FOR PRODUCTION**',
            'reject': '🔴 **DO NOT USE**',
            'needs_tuning': '🟡 **REQUIRES ADJUSTMENT**',
            'insufficient_data': '⚪ **NEEDS MORE DATA**'
        }
        return badges.get(recommendation, recommendation.upper())

    def _interpret_delta(self, delta: float) -> str:
        """Interpret delta value"""
        if delta > 10:
            return "Significant improvement"
        elif delta > 5:
            return "Moderate improvement"
        elif delta > 0:
            return "Slight improvement"
        elif delta == 0:
            return "No change"
        elif delta > -5:
            return "Slight decline"
        elif delta > -10:
            return "Moderate decline"
        else:
            return "Significant decline"

    def _interpret_p_value(self, p_value: float, is_significant: bool) -> str:
        """Interpret p-value for non-technical audience"""
        if is_significant:
            return f"""The difference in performance is **statistically significant** (p = {p_value:.4f}).
This means there's less than 5% probability that the observed difference is due to random chance.
**The result is reliable.**"""
        else:
            return f"""The difference in performance is **not statistically significant** (p = {p_value:.4f}).
This means the observed difference could easily be due to random chance.
**Do not make decisions based on this test alone.**"""

    # ================================================================
    # BULK REPORTS
    # ================================================================

    def generate_candidate_comparison_report(self) -> str:
        """Generate report comparing all tested candidates"""
        # Fetch all tested candidates
        result = self.db.client.table('candidate_performance_summary').select('*').execute()

        if not result.data:
            return "No candidate rules have been tested yet."

        report = "# 📊 Candidate Rules Comparison Report\n\n"
        report += f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        report += "---\n\n"

        report += "| Candidate ID | Rule Name | Times Tested | Avg Win Rate | Avg Delta | Approvals |\n"
        report += "|--------------|-----------|--------------|--------------|-----------|----------|\n"

        for candidate in result.data:
            report += f"| `{candidate['candidate_id']}` | {candidate['rule_name']} | "
            report += f"{candidate['times_tested']} | {candidate['avg_win_rate']:.1f}% | "
            report += f"{candidate['avg_delta_vs_baseline']:+.1f}% | {candidate['approval_count']} |\n"

        return report


# ================================================================
# CLI INTERFACE
# ================================================================

if __name__ == "__main__":
    """
    Generate test reports
    """
    import sys
    sys.path.append('.')
    from db import get_client

    if len(sys.argv) < 2:
        print("Usage: python sandbox_report_generator.py <test_run_id>")
        sys.exit(1)

    test_run_id = sys.argv[1]

    db = get_client()
    reporter = SandboxReportGenerator(db)

    print("Generating report...\n")
    report = reporter.generate_test_report(test_run_id)

    # Save to file
    filename = f"sandbox_report_{test_run_id}.md"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"✅ Report saved to: {filename}\n")
    print(report)
