"""
Sandbox Rule Evaluator
READ-ONLY testing of candidate rules on historical data

RULES:
- No live data mutation
- No rule activation
- No system-wide impact
- Frozen by design - no future enhancements
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from scipy import stats
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class CandidateRule:
    """Draft rule being tested"""
    candidate_id: str
    rule_name: str
    rule_description: str
    rule_logic: str
    rule_type: str  # 'python_function' or 'json_conditions'
    prediction_type: str
    confidence_base: float
    conditions: Optional[Dict] = None


@dataclass
class TestResult:
    """Test execution result"""
    test_run_id: str
    total_matches: int
    candidate_predictions: int
    candidate_wins: int
    candidate_losses: int
    candidate_win_rate: float
    baseline_predictions: int
    baseline_wins: int
    baseline_losses: int
    baseline_win_rate: float
    win_rate_delta: float
    p_value: float
    is_significant: bool
    recommendation: str
    recommendation_reason: str


class SandboxEvaluator:
    """
    Test candidate rules on historical data
    NO LIVE DATA IMPACT
    """

    def __init__(self, db_client):
        self.db = db_client
        self.min_sample_size = 30  # Minimum matches for valid test

    # ================================================================
    # CANDIDATE RULE MANAGEMENT
    # ================================================================

    def add_candidate_rule(self,
                           candidate_id: str,
                           rule_name: str,
                           rule_description: str,
                           rule_logic: str,
                           rule_type: str,
                           prediction_type: str,
                           confidence_base: float,
                           conditions: Optional[Dict] = None,
                           created_by: str = "admin") -> str:
        """
        Add a new candidate rule for testing
        Does NOT activate it - only stores for testing
        """
        try:
            rule_data = {
                "candidate_id": candidate_id,
                "rule_name": rule_name,
                "rule_description": rule_description,
                "rule_logic": rule_logic,
                "rule_type": rule_type,
                "prediction_type": prediction_type,
                "confidence_base": confidence_base,
                "conditions": conditions or {},
                "created_by": created_by,
                "test_status": "draft"
            }

            result = self.db.client.table('candidate_rules').insert(rule_data).execute()

            if not result.data:
                raise Exception("Failed to insert candidate rule")

            logger.info(f"✅ Candidate rule added: {candidate_id}")
            return candidate_id

        except Exception as e:
            logger.error(f"Failed to add candidate rule: {e}")
            raise

    # ================================================================
    # HISTORICAL DATA TEST
    # ================================================================

    def test_candidate_rule(self,
                            candidate_id: str,
                            test_period_days: int = 60,
                            baseline_type: str = "golden_rules",
                            baseline_rule_id: Optional[int] = None,
                            test_name: Optional[str] = None) -> TestResult:
        """
        Test candidate rule on historical data
        Compare against baseline (no rules or golden rules)

        Returns: TestResult with performance metrics
        """
        # Fetch candidate rule
        candidate_result = self.db.client.table('candidate_rules').select(
            '*'
        ).eq('candidate_id', candidate_id).execute()

        if not candidate_result.data:
            raise Exception(f"Candidate rule {candidate_id} not found")

        candidate = CandidateRule(**candidate_result.data[0])

        # Generate test_run_id
        test_run_id = f"TEST-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

        # Define test period (historical data only)
        test_period_end = datetime.now(timezone.utc).date() - timedelta(days=1)
        test_period_start = test_period_end - timedelta(days=test_period_days)

        logger.info(f"🧪 Testing {candidate_id} on {test_period_start} to {test_period_end}")

        # Update candidate status
        self.db.client.table('candidate_rules').update({
            "test_status": "testing",
            "last_tested_at": datetime.now(timezone.utc).isoformat()
        }).eq('candidate_id', candidate_id).execute()

        # Fetch historical matches with outcomes
        matches = self._fetch_historical_matches(test_period_start, test_period_end)

        if len(matches) < self.min_sample_size:
            logger.warning(f"⚠️  Insufficient data: {len(matches)} matches < {self.min_sample_size}")
            return self._insufficient_data_result(test_run_id, len(matches))

        logger.info(f"📊 Found {len(matches)} historical matches")

        # Evaluate candidate rule on each match
        candidate_results = []
        baseline_results = []

        for match in matches:
            # Test candidate rule
            candidate_pred = self._evaluate_candidate_on_match(candidate, match)
            candidate_results.append(candidate_pred)

            # Test baseline
            if baseline_type == "golden_rules":
                baseline_pred = self._evaluate_golden_rules_on_match(match)
            elif baseline_type == "specific_rule":
                baseline_pred = self._evaluate_specific_rule_on_match(baseline_rule_id, match)
            else:  # no_rules
                baseline_pred = None

            baseline_results.append(baseline_pred)

            # Store match result
            self._store_match_result(test_run_id, match, candidate_pred, baseline_pred)

        # Calculate metrics
        result = self._calculate_test_metrics(
            test_run_id,
            candidate,
            candidate_results,
            baseline_results,
            test_period_start,
            test_period_end,
            baseline_type,
            baseline_rule_id
        )

        # Store test run
        self._store_test_run(result, candidate_id, test_name or f"Test of {candidate.rule_name}")

        # Generate comparison reports
        self._generate_comparison_reports(test_run_id, matches, candidate_results, baseline_results)

        # Update candidate test results
        self.db.client.table('candidate_rules').update({
            "test_status": "tested",
            "last_tested_at": datetime.now(timezone.utc).isoformat(),
            "test_sample_size": len(matches),
            "test_win_rate": result.candidate_win_rate,
            "test_confidence_accuracy": result.candidate_win_rate  # Simplified
        }).eq('candidate_id', candidate_id).execute()

        logger.info(f"✅ Test completed: {result.recommendation}")

        return result

    # ================================================================
    # PRIVATE: MATCH EVALUATION
    # ================================================================

    def _fetch_historical_matches(self, start_date, end_date) -> List[Dict]:
        """Fetch historical matches with outcomes"""
        query = """
        SELECT
            m.id as match_id,
            m.home_team,
            m.away_team,
            m.league,
            m.match_date,
            m.home_odds,
            m.draw_odds,
            m.away_odds,
            m.home_score,
            m.away_score,
            p.outcome as actual_outcome,
            p.prediction_type,
            p.golden_rule_id
        FROM matches m
        LEFT JOIN predictions p ON p.match_id = m.id
        WHERE m.match_date >= %s
          AND m.match_date <= %s
          AND m.home_score IS NOT NULL
          AND m.away_score IS NOT NULL
        ORDER BY m.match_date DESC
        """

        results = self.db.execute_raw(query, (start_date, end_date))
        return results

    def _evaluate_candidate_on_match(self, candidate: CandidateRule, match: Dict) -> Optional[Dict]:
        """
        Evaluate if candidate rule would trigger on this match
        Returns prediction dict if triggered, None otherwise
        """
        # Simple JSON conditions evaluation
        if candidate.rule_type == 'json_conditions':
            if not self._check_conditions(candidate.conditions, match):
                return None

            # Rule triggered - simulate prediction
            return {
                "predicted": True,
                "prediction_type": candidate.prediction_type,
                "confidence": candidate.confidence_base,
                "result": self._evaluate_prediction_outcome(
                    candidate.prediction_type,
                    match['home_score'],
                    match['away_score']
                )
            }

        # Python function evaluation not implemented (security risk)
        # In production, this would require sandboxed execution

        return None

    def _check_conditions(self, conditions: Dict, match: Dict) -> bool:
        """Check if match meets rule conditions"""
        if not conditions:
            return False

        # Check home_odds range
        if 'home_odds' in conditions:
            odds_cond = conditions['home_odds']
            home_odds = match.get('home_odds')
            if home_odds is None:
                return False
            if 'min' in odds_cond and home_odds < odds_cond['min']:
                return False
            if 'max' in odds_cond and home_odds > odds_cond['max']:
                return False

        # Check away_odds range
        if 'away_odds' in conditions:
            odds_cond = conditions['away_odds']
            away_odds = match.get('away_odds')
            if away_odds is None:
                return False
            if 'min' in odds_cond and away_odds < odds_cond['min']:
                return False
            if 'max' in odds_cond and away_odds > odds_cond['max']:
                return False

        # Check league
        if 'leagues' in conditions:
            if match.get('league') not in conditions['leagues']:
                return False

        return True

    def _evaluate_prediction_outcome(self, prediction_type: str, home_score: int, away_score: int) -> str:
        """Determine if prediction was correct based on actual outcome"""
        total_goals = home_score + away_score

        if prediction_type == "MS 2.5 ÜST":
            return "won" if total_goals > 2.5 else "lost"
        elif prediction_type == "MS 2.5 ALT":
            return "won" if total_goals < 2.5 else "lost"
        elif prediction_type == "İY 0.5 ÜST":
            # Simplified - would need half-time scores
            return "unknown"
        elif prediction_type == "KG VAR":
            return "won" if home_score > 0 and away_score > 0 else "lost"

        return "unknown"

    def _evaluate_golden_rules_on_match(self, match: Dict) -> Optional[Dict]:
        """Check if any golden rule made a prediction on this match"""
        # In real implementation, would check predictions table
        # For now, simplified version

        if match.get('golden_rule_id') and match.get('actual_outcome') is not None:
            return {
                "predicted": True,
                "prediction_type": match.get('prediction_type'),
                "confidence": 80.0,  # Simplified
                "result": "won" if match.get('actual_outcome') else "lost"
            }

        return None

    def _evaluate_specific_rule_on_match(self, rule_id: int, match: Dict) -> Optional[Dict]:
        """Check if specific golden rule made prediction"""
        if match.get('golden_rule_id') == rule_id:
            return {
                "predicted": True,
                "prediction_type": match.get('prediction_type'),
                "confidence": 80.0,
                "result": "won" if match.get('actual_outcome') else "lost"
            }
        return None

    # ================================================================
    # PRIVATE: METRICS CALCULATION
    # ================================================================

    def _calculate_test_metrics(self,
                                 test_run_id: str,
                                 candidate: CandidateRule,
                                 candidate_results: List[Optional[Dict]],
                                 baseline_results: List[Optional[Dict]],
                                 start_date, end_date,
                                 baseline_type: str,
                                 baseline_rule_id: Optional[int]) -> TestResult:
        """Calculate performance metrics and comparison"""

        # Candidate metrics
        candidate_preds = [r for r in candidate_results if r and r['predicted']]
        candidate_total = len(candidate_preds)
        candidate_wins = len([r for r in candidate_preds if r['result'] == 'won'])
        candidate_losses = len([r for r in candidate_preds if r['result'] == 'lost'])
        candidate_win_rate = (candidate_wins / candidate_total * 100) if candidate_total > 0 else 0.0

        # Baseline metrics
        baseline_preds = [r for r in baseline_results if r and r['predicted']]
        baseline_total = len(baseline_preds)
        baseline_wins = len([r for r in baseline_preds if r['result'] == 'won'])
        baseline_losses = len([r for r in baseline_preds if r['result'] == 'lost'])
        baseline_win_rate = (baseline_wins / baseline_total * 100) if baseline_total > 0 else 0.0

        # Calculate delta
        win_rate_delta = candidate_win_rate - baseline_win_rate

        # Statistical significance test
        if candidate_total >= self.min_sample_size and baseline_total >= self.min_sample_size:
            p_value = self._proportion_test(
                candidate_wins, candidate_total,
                baseline_wins / baseline_total if baseline_total > 0 else 0.5
            )
            is_significant = p_value < 0.05
        else:
            p_value = 1.0
            is_significant = False

        # Generate recommendation
        recommendation, reason = self._generate_recommendation(
            candidate_total,
            win_rate_delta,
            is_significant,
            candidate_win_rate
        )

        return TestResult(
            test_run_id=test_run_id,
            total_matches=len(candidate_results),
            candidate_predictions=candidate_total,
            candidate_wins=candidate_wins,
            candidate_losses=candidate_losses,
            candidate_win_rate=round(candidate_win_rate, 2),
            baseline_predictions=baseline_total,
            baseline_wins=baseline_wins,
            baseline_losses=baseline_losses,
            baseline_win_rate=round(baseline_win_rate, 2),
            win_rate_delta=round(win_rate_delta, 2),
            p_value=round(p_value, 4),
            is_significant=is_significant,
            recommendation=recommendation,
            recommendation_reason=reason
        )

    def _proportion_test(self, successes: int, total: int, expected_proportion: float) -> float:
        """Test if observed proportion differs from expected"""
        if total == 0:
            return 1.0

        observed = successes / total
        se = np.sqrt(expected_proportion * (1 - expected_proportion) / total)

        if se == 0:
            return 1.0

        z_score = (observed - expected_proportion) / se
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))

        return p_value

    def _generate_recommendation(self,
                                  sample_size: int,
                                  win_rate_delta: float,
                                  is_significant: bool,
                                  win_rate: float) -> tuple:
        """Generate recommendation based on test results"""

        if sample_size < self.min_sample_size:
            return ("insufficient_data", f"Only {sample_size} predictions, need {self.min_sample_size}+")

        if not is_significant:
            return ("reject", "No statistically significant improvement over baseline")

        if win_rate_delta > 5 and win_rate > 75:
            return ("approve", f"+{win_rate_delta:.1f}% improvement, ready for production")

        if win_rate_delta > 0 and win_rate > 70:
            return ("needs_tuning", f"+{win_rate_delta:.1f}% improvement but confidence needs adjustment")

        return ("reject", "Does not perform better than baseline")

    def _insufficient_data_result(self, test_run_id: str, match_count: int) -> TestResult:
        """Return result for insufficient data case"""
        return TestResult(
            test_run_id=test_run_id,
            total_matches=match_count,
            candidate_predictions=0,
            candidate_wins=0,
            candidate_losses=0,
            candidate_win_rate=0.0,
            baseline_predictions=0,
            baseline_wins=0,
            baseline_losses=0,
            baseline_win_rate=0.0,
            win_rate_delta=0.0,
            p_value=1.0,
            is_significant=False,
            recommendation="insufficient_data",
            recommendation_reason=f"Only {match_count} matches found in test period"
        )

    # ================================================================
    # PRIVATE: STORAGE
    # ================================================================

    def _store_test_run(self, result: TestResult, candidate_id: str, test_name: str) -> None:
        """Store test run results"""
        try:
            run_data = {
                "test_run_id": result.test_run_id,
                "test_name": test_name,
                "candidate_id": candidate_id,
                "test_period_start": (datetime.now(timezone.utc).date() - timedelta(days=60)).isoformat(),
                "test_period_end": (datetime.now(timezone.utc).date() - timedelta(days=1)).isoformat(),
                "baseline_type": "golden_rules",
                "executed_by": "system",
                "total_matches_tested": result.total_matches,
                "candidate_predictions_count": result.candidate_predictions,
                "baseline_predictions_count": result.baseline_predictions,
                "candidate_win_count": result.candidate_wins,
                "candidate_loss_count": result.candidate_losses,
                "candidate_win_rate": result.candidate_win_rate,
                "baseline_win_count": result.baseline_wins,
                "baseline_loss_count": result.baseline_losses,
                "baseline_win_rate": result.baseline_win_rate,
                "win_rate_delta": result.win_rate_delta,
                "p_value": result.p_value,
                "is_significant": result.is_significant,
                "recommendation": result.recommendation,
                "recommendation_reason": result.recommendation_reason,
                "status": "completed"
            }

            self.db.client.table('sandbox_test_runs').insert(run_data).execute()

        except Exception as e:
            logger.error(f"Failed to store test run: {e}")

    def _store_match_result(self, test_run_id: str, match: Dict,
                            candidate_pred: Optional[Dict],
                            baseline_pred: Optional[Dict]) -> None:
        """Store per-match test result"""
        try:
            result_data = {
                "test_run_id": test_run_id,
                "match_id": match['match_id'],
                "home_team": match['home_team'],
                "away_team": match['away_team'],
                "league": match['league'],
                "match_date": match['match_date'],
                "actual_home_score": match['home_score'],
                "actual_away_score": match['away_score'],
                "actual_outcome": "completed",
                "candidate_predicted": bool(candidate_pred),
                "candidate_prediction": candidate_pred['prediction_type'] if candidate_pred else None,
                "candidate_confidence": candidate_pred['confidence'] if candidate_pred else None,
                "candidate_result": candidate_pred['result'] if candidate_pred else None,
                "baseline_predicted": bool(baseline_pred),
                "baseline_prediction": baseline_pred['prediction_type'] if baseline_pred else None,
                "baseline_confidence": baseline_pred['confidence'] if baseline_pred else None,
                "baseline_result": baseline_pred['result'] if baseline_pred else None,
                "home_odds": match.get('home_odds'),
                "draw_odds": match.get('draw_odds'),
                "away_odds": match.get('away_odds')
            }

            self.db.client.table('sandbox_match_results').insert(result_data).execute()

        except Exception as e:
            logger.error(f"Failed to store match result: {e}")

    def _generate_comparison_reports(self, test_run_id: str, matches: List,
                                     candidate_results: List, baseline_results: List) -> None:
        """Generate aggregate comparison reports"""
        # Simplified - would generate by_league, by_odds_range, etc.
        pass


# ================================================================
# CLI INTERFACE
# ================================================================

if __name__ == "__main__":
    """
    Test sandbox evaluator
    """
    import sys
    sys.path.append('.')
    from db import get_client

    logging.basicConfig(level=logging.INFO)

    db = get_client()
    sandbox = SandboxEvaluator(db)

    # Example: Add candidate rule
    candidate_id = "CAND-MS-001"

    try:
        sandbox.add_candidate_rule(
            candidate_id=candidate_id,
            rule_name="MS 2.5 Üst - Yüksek Deplasman Oranı",
            rule_description="MS 2.5 Üst tahmin eder, deplasman oranı 2.5+ olduğunda",
            rule_logic="JSON conditions",
            rule_type="json_conditions",
            prediction_type="MS 2.5 ÜST",
            confidence_base=82.0,
            conditions={
                "away_odds": {"min": 2.5, "max": 5.0}
            },
            created_by="admin"
        )
        print(f"✅ Candidate rule added: {candidate_id}")
    except Exception as e:
        print(f"❌ Failed to add rule: {e}")

    # Test the rule
    result = sandbox.test_candidate_rule(
        candidate_id=candidate_id,
        test_period_days=60,
        baseline_type="golden_rules"
    )

    print(f"\n{'='*60}")
    print("TEST RESULTS")
    print(f"{'='*60}")
    print(f"Test ID: {result.test_run_id}")
    print(f"Total Matches: {result.total_matches}")
    print(f"\nCandidate Performance:")
    print(f"  Predictions: {result.candidate_predictions}")
    print(f"  Wins: {result.candidate_wins}")
    print(f"  Win Rate: {result.candidate_win_rate}%")
    print(f"\nBaseline Performance:")
    print(f"  Predictions: {result.baseline_predictions}")
    print(f"  Wins: {result.baseline_wins}")
    print(f"  Win Rate: {result.baseline_win_rate}%")
    print(f"\nComparison:")
    print(f"  Delta: {result.win_rate_delta:+.2f}%")
    print(f"  P-value: {result.p_value}")
    print(f"  Significant: {result.is_significant}")
    print(f"\nRecommendation: {result.recommendation}")
    print(f"Reason: {result.recommendation_reason}")
    print(f"{'='*60}")
