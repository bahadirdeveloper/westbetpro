"""
Learning Engine - Statistical Analysis & Suggestion Generator
READ-ONLY: Analyzes historical data, never modifies rules automatically
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass
from scipy import stats
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class RulePerformance:
    """Rule performance metrics"""
    rule_id: int
    rule_code: str
    total_predictions: int
    won_count: int
    lost_count: int
    success_rate: float
    baseline_success_rate: float
    delta: float
    confidence_interval: tuple
    p_value: float
    is_significant: bool


@dataclass
class Suggestion:
    """System suggestion for admin review"""
    suggestion_id: str
    severity: str  # low, medium, high
    category: str
    title: str
    description: str
    data: dict
    recommendation: str
    justification: str
    suggested_actions: List[str]
    action_required: bool


class LearningEngine:
    """
    Analyzes historical prediction outcomes
    Generates suggestions for admin review
    NEVER modifies rules automatically
    """

    def __init__(self, db_client):
        self.db = db_client
        self.min_sample_size = 30  # Minimum predictions for analysis
        self.significance_threshold = 0.05  # p-value threshold

    # ================================================================
    # RULE PERFORMANCE ANALYSIS
    # ================================================================

    def analyze_rule_performance(self, days: int = 30) -> List[RulePerformance]:
        """
        Analyze performance of all rules over last N days
        Returns list of rule performance metrics
        """
        logger.info(f"Analyzing rule performance for last {days} days")

        period_start = datetime.now() - timedelta(days=days)

        # Query predictions with outcomes
        query = """
        SELECT
            gr.id as rule_id,
            gr.rule_code,
            gr.success_rate as baseline_success_rate,
            COUNT(p.id) as total_predictions,
            COUNT(CASE WHEN p.outcome = true THEN 1 END) as won_count,
            COUNT(CASE WHEN p.outcome = false THEN 1 END) as lost_count
        FROM golden_rules gr
        LEFT JOIN predictions p ON p.golden_rule_id = gr.id
        WHERE p.created_at >= %s
          AND p.outcome IS NOT NULL
        GROUP BY gr.id, gr.rule_code, gr.success_rate
        HAVING COUNT(p.id) >= %s
        """

        results = self.db.execute_raw(query, (period_start, self.min_sample_size))

        performances = []
        for row in results:
            total = row['total_predictions']
            won = row['won_count']

            if total == 0:
                continue

            success_rate = (won / total) * 100
            baseline = row['baseline_success_rate'] or 80.0
            delta = success_rate - baseline

            # Calculate confidence interval (Wilson score)
            ci_lower, ci_upper = self._wilson_confidence_interval(won, total)

            # Statistical significance test
            p_value = self._proportion_test(won, total, baseline / 100)
            is_significant = p_value < self.significance_threshold

            performances.append(RulePerformance(
                rule_id=row['rule_id'],
                rule_code=row['rule_code'],
                total_predictions=total,
                won_count=won,
                lost_count=row['lost_count'],
                success_rate=round(success_rate, 2),
                baseline_success_rate=baseline,
                delta=round(delta, 2),
                confidence_interval=(round(ci_lower * 100, 2), round(ci_upper * 100, 2)),
                p_value=round(p_value, 4),
                is_significant=is_significant
            ))

        logger.info(f"Analyzed {len(performances)} rules")
        return performances

    # ================================================================
    # SUGGESTION GENERATION
    # ================================================================

    def generate_suggestions(self) -> List[Suggestion]:
        """
        Generate all suggestions based on current data
        Returns list of actionable suggestions for admin
        """
        suggestions = []

        # 1. Rule degradation detection
        suggestions.extend(self._detect_rule_degradation())

        # 2. League reliability issues
        suggestions.extend(self._detect_league_issues())

        # 3. Confidence calibration problems
        suggestions.extend(self._detect_confidence_inflation())

        logger.info(f"Generated {len(suggestions)} suggestions")
        return suggestions

    def _detect_rule_degradation(self) -> List[Suggestion]:
        """Detect rules performing significantly below baseline"""
        suggestions = []

        performances = self.analyze_rule_performance(days=30)

        for perf in performances:
            # Only flag significant degradation
            if not perf.is_significant:
                continue

            if perf.delta < -5:  # More than 5% below baseline
                severity = self._calculate_severity(perf.delta)

                suggestion = Suggestion(
                    suggestion_id=f"SUG-{datetime.now().strftime('%Y%m%d')}-R{perf.rule_id}",
                    severity=severity,
                    category="rule_performance",
                    title=f"Rule {perf.rule_code} Degradation Detected",
                    description=f"Rule {perf.rule_code} has dropped to {perf.success_rate}% success rate in last 30 days, down from baseline {perf.baseline_success_rate}%.",
                    data={
                        "rule_id": perf.rule_id,
                        "rule_code": perf.rule_code,
                        "baseline_success_rate": perf.baseline_success_rate,
                        "current_success_rate": perf.success_rate,
                        "delta": perf.delta,
                        "sample_size": perf.total_predictions,
                        "won_count": perf.won_count,
                        "lost_count": perf.lost_count,
                        "confidence_interval": f"{perf.confidence_interval[0]}% - {perf.confidence_interval[1]}% (95% CI)",
                        "p_value": perf.p_value
                    },
                    recommendation=self._generate_recommendation(perf),
                    justification=f"{abs(perf.delta):.1f}% drop is statistically significant (p = {perf.p_value:.4f}) over {perf.total_predictions} predictions",
                    suggested_actions=[
                        f"Lower confidence_base by {abs(int(perf.delta * 0.8))} points",
                        "Add additional filters to rule conditions",
                        "Disable rule temporarily and monitor",
                        f"Review last {perf.lost_count} losses for pattern"
                    ],
                    action_required=severity == 'high'
                )

                suggestions.append(suggestion)

        return suggestions

    def _detect_league_issues(self) -> List[Suggestion]:
        """Detect leagues with poor reliability"""
        suggestions = []

        query = """
        SELECT
            m.league,
            COUNT(p.id) as total_predictions,
            COUNT(CASE WHEN p.outcome = true THEN 1 END) as won_count,
            AVG(CASE WHEN p.outcome = true THEN 1.0 ELSE 0.0 END) as success_rate
        FROM matches m
        JOIN predictions p ON p.match_id = m.id
        WHERE p.created_at >= NOW() - INTERVAL '60 days'
          AND p.outcome IS NOT NULL
        GROUP BY m.league
        HAVING COUNT(p.id) >= 20
        """

        results = self.db.execute_raw(query)

        for row in results:
            success_rate = row['success_rate'] * 100

            # Flag leagues below 70% success
            if success_rate < 70:
                suggestions.append(Suggestion(
                    suggestion_id=f"SUG-{datetime.now().strftime('%Y%m%d')}-L{hash(row['league']) % 1000}",
                    severity='medium' if success_rate < 65 else 'low',
                    category="league_reliability",
                    title=f"Low Reliability: {row['league']}",
                    description=f"League '{row['league']}' shows only {success_rate:.1f}% success rate over last 60 days ({row['total_predictions']} predictions).",
                    data={
                        "league": row['league'],
                        "success_rate": round(success_rate, 2),
                        "total_predictions": row['total_predictions'],
                        "won_count": row['won_count']
                    },
                    recommendation=f"Consider filtering out {row['league']} or reducing confidence for this league",
                    justification=f"Based on {row['total_predictions']} predictions, significantly below system average",
                    suggested_actions=[
                        f"Add league filter to exclude {row['league']}",
                        "Reduce confidence by 10 points for this league",
                        "Monitor for 2 more weeks before action"
                    ],
                    action_required=success_rate < 65
                ))

        return suggestions

    def _detect_confidence_inflation(self) -> List[Suggestion]:
        """Detect if confidence scores are inflated"""
        suggestions = []

        # Check confidence calibration
        query = """
        SELECT
            CASE
                WHEN confidence >= 95 THEN '95-100'
                WHEN confidence >= 90 THEN '90-95'
                WHEN confidence >= 85 THEN '85-90'
                WHEN confidence >= 80 THEN '80-85'
                ELSE '70-80'
            END as confidence_bucket,
            COUNT(*) as total,
            COUNT(CASE WHEN outcome = true THEN 1 END) as won,
            AVG(confidence) as avg_confidence
        FROM predictions
        WHERE outcome IS NOT NULL
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY confidence_bucket
        HAVING COUNT(*) >= 20
        """

        results = self.db.execute_raw(query)

        for row in results:
            actual_success = (row['won'] / row['total']) * 100
            expected_success = row['avg_confidence']
            inflation = actual_success - expected_success

            # Flag if actual is more than 5% off from expected
            if abs(inflation) > 5:
                suggestions.append(Suggestion(
                    suggestion_id=f"SUG-{datetime.now().strftime('%Y%m%d')}-C{row['confidence_bucket']}",
                    severity='medium' if abs(inflation) > 8 else 'low',
                    category="confidence_calibration",
                    title=f"Confidence {'Inflation' if inflation < 0 else 'Deflation'}: {row['confidence_bucket']}%",
                    description=f"Predictions in {row['confidence_bucket']}% range show {abs(inflation):.1f}% {'under' if inflation < 0 else 'over'}-performance compared to stated confidence.",
                    data={
                        "confidence_bucket": row['confidence_bucket'],
                        "expected_success": round(expected_success, 2),
                        "actual_success": round(actual_success, 2),
                        "inflation": round(inflation, 2),
                        "sample_size": row['total']
                    },
                    recommendation=f"{'Reduce' if inflation < 0 else 'Increase'} confidence scores in this range by ~{abs(int(inflation))} points",
                    justification=f"Based on {row['total']} predictions, calibration is off by {abs(inflation):.1f}%",
                    suggested_actions=[
                        f"Adjust confidence_base for rules in this range",
                        "Review rule confidence calculations",
                        "Monitor for another 30 days"
                    ],
                    action_required=False
                ))

        return suggestions

    # ================================================================
    # STATISTICAL UTILITIES
    # ================================================================

    def _wilson_confidence_interval(self, successes: int, total: int, confidence: float = 0.95) -> tuple:
        """
        Calculate Wilson score confidence interval
        More accurate than normal approximation for small samples
        """
        if total == 0:
            return (0.0, 0.0)

        p = successes / total
        z = stats.norm.ppf((1 + confidence) / 2)

        denominator = 1 + z**2 / total
        center = (p + z**2 / (2 * total)) / denominator
        margin = z * np.sqrt((p * (1 - p) + z**2 / (4 * total)) / total) / denominator

        return (max(0, center - margin), min(1, center + margin))

    def _proportion_test(self, successes: int, total: int, expected_proportion: float) -> float:
        """
        Test if observed proportion is significantly different from expected
        Returns p-value
        """
        if total == 0:
            return 1.0

        observed = successes / total
        se = np.sqrt(expected_proportion * (1 - expected_proportion) / total)

        if se == 0:
            return 1.0

        z_score = (observed - expected_proportion) / se
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))

        return p_value

    def _calculate_severity(self, delta: float) -> str:
        """Calculate suggestion severity based on delta"""
        if delta < -10:
            return 'high'
        elif delta < -7:
            return 'medium'
        else:
            return 'low'

    def _generate_recommendation(self, perf: RulePerformance) -> str:
        """Generate human-readable recommendation"""
        if perf.delta < -10:
            return f"Disable rule temporarily or reduce confidence_base by {abs(int(perf.delta))} points immediately"
        elif perf.delta < -7:
            return f"Consider reducing confidence_base by {abs(int(perf.delta * 0.8))} points or adding filters"
        else:
            return "Monitor closely for another week before action"

    # ================================================================
    # PERSISTENCE
    # ================================================================

    def save_suggestions(self, suggestions: List[Suggestion]) -> int:
        """
        Save suggestions to database for admin review
        Returns count of new suggestions
        """
        new_count = 0

        for sugg in suggestions:
            # Check if suggestion already exists
            existing = self.db.client.table('system_suggestions').select('id').eq(
                'suggestion_id', sugg.suggestion_id
            ).execute()

            if not existing.data:
                # Insert new suggestion
                self.db.client.table('system_suggestions').insert({
                    'suggestion_id': sugg.suggestion_id,
                    'severity': sugg.severity,
                    'category': sugg.category,
                    'title': sugg.title,
                    'description': sugg.description,
                    'data': sugg.data,
                    'recommendation': sugg.recommendation,
                    'justification': sugg.justification,
                    'suggested_actions': sugg.suggested_actions,
                    'action_required': sugg.action_required,
                    'status': 'pending'
                }).execute()

                new_count += 1

        logger.info(f"Saved {new_count} new suggestions")
        return new_count


# ================================================================
# CLI INTERFACE
# ================================================================

if __name__ == "__main__":
    """
    Run learning engine to generate suggestions
    Usage: python learning_engine.py
    """
    import sys
    sys.path.append('.')
    from db import get_client

    logging.basicConfig(level=logging.INFO)

    db = get_client()
    engine = LearningEngine(db)

    print("=" * 60)
    print("WestBetPro Learning Engine")
    print("Analyzing historical data...")
    print("=" * 60)

    # Generate suggestions
    suggestions = engine.generate_suggestions()

    print(f"\nGenerated {len(suggestions)} suggestions:\n")

    for sugg in suggestions:
        print(f"[{sugg.severity.upper()}] {sugg.title}")
        print(f"  {sugg.description}")
        print(f"  → {sugg.recommendation}")
        print()

    # Save to database
    saved = engine.save_suggestions(suggestions)
    print(f"\nSaved {saved} new suggestions to database.")
    print("\nAdmin can review at: /admin/suggestions")
