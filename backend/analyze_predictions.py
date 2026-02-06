"""
Prediction Analytics Module
Analyzes prediction results and rule performance from Supabase
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from db import get_client

logger = logging.getLogger(__name__)


class PredictionAnalytics:
    """
    Provides prediction statistics and rule performance analysis.
    All data is fetched from Supabase predictions table.
    """

    def __init__(self):
        self.db = get_client()

    def get_statistics(self, days_back: int = 7) -> Dict[str, Any]:
        """
        Get comprehensive prediction statistics.

        Args:
            days_back: Number of days to look back (0 = all time)

        Returns:
            Dict with overall stats, rule stats, and daily breakdown
        """
        try:
            query = self.db.client.table('predictions').select('*')

            if days_back > 0:
                cutoff = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
                query = query.gte('created_at', cutoff)

            result = query.execute()
            predictions = result.data if result.data else []

            if not predictions:
                return self._empty_stats()

            # Calculate overall stats
            overall = self._calculate_overall(predictions)

            # Calculate per-rule stats
            rule_stats = self._calculate_rule_stats(predictions)

            # Calculate daily breakdown
            daily = self._calculate_daily_breakdown(predictions)

            return {
                'total_predictions': len(predictions),
                'days_analyzed': days_back if days_back > 0 else 'all',
                'overall': overall,
                'rule_stats': rule_stats,
                'daily_breakdown': daily
            }

        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return self._empty_stats()

    def analyze_rule_performance(self, min_sample: int = 3) -> List[Dict[str, Any]]:
        """
        Analyze performance of each prediction rule.

        Args:
            min_sample: Minimum finished predictions required

        Returns:
            List of rule performance records sorted by win rate
        """
        try:
            result = self.db.client.table('predictions').select(
                'matched_rules, result, confidence'
            ).execute()

            predictions = result.data if result.data else []
            rule_map: Dict[str, Dict] = {}

            for pred in predictions:
                rules = pred.get('matched_rules') or []
                res = pred.get('result', 'pending')
                conf = pred.get('confidence', 0)

                if isinstance(rules, str):
                    rules = [rules]

                for rule in rules:
                    rule_key = str(rule)
                    if rule_key not in rule_map:
                        rule_map[rule_key] = {
                            'rule_id': rule_key,
                            'total': 0, 'won': 0, 'lost': 0, 'pending': 0,
                            'total_confidence': 0
                        }

                    rule_map[rule_key]['total'] += 1
                    rule_map[rule_key]['total_confidence'] += conf

                    if res == 'won':
                        rule_map[rule_key]['won'] += 1
                    elif res == 'lost':
                        rule_map[rule_key]['lost'] += 1
                    else:
                        rule_map[rule_key]['pending'] += 1

            # Build results with min sample filter
            results = []
            for rule_id, data in rule_map.items():
                finished = data['won'] + data['lost']
                if finished >= min_sample:
                    win_rate = round(data['won'] / finished * 100, 2) if finished > 0 else 0
                    avg_conf = round(data['total_confidence'] / data['total'], 1) if data['total'] > 0 else 0

                    results.append({
                        'rule_id': rule_id,
                        'total': data['total'],
                        'won': data['won'],
                        'lost': data['lost'],
                        'pending': data['pending'],
                        'finished': finished,
                        'win_rate': win_rate,
                        'avg_confidence': avg_conf
                    })

            results.sort(key=lambda x: (x['win_rate'], x['finished']), reverse=True)
            return results

        except Exception as e:
            logger.error(f"Failed to analyze rule performance: {e}")
            return []

    def _calculate_overall(self, predictions: List[Dict]) -> Dict[str, Any]:
        """Calculate overall prediction statistics."""
        total = len(predictions)
        won = sum(1 for p in predictions if p.get('result') == 'won')
        lost = sum(1 for p in predictions if p.get('result') == 'lost')
        pending = sum(1 for p in predictions if p.get('result') == 'pending')
        finished = won + lost

        avg_confidence = 0
        if total > 0:
            confidences = [p.get('confidence', 0) for p in predictions if p.get('confidence')]
            avg_confidence = round(sum(confidences) / len(confidences), 1) if confidences else 0

        return {
            'total': total,
            'won': won,
            'lost': lost,
            'pending': pending,
            'finished': finished,
            'win_rate': round(won / finished * 100, 2) if finished > 0 else 0,
            'avg_confidence': avg_confidence
        }

    def _calculate_rule_stats(self, predictions: List[Dict]) -> Dict[str, Dict]:
        """Calculate per-rule statistics."""
        rule_stats: Dict[str, Dict] = {}

        for pred in predictions:
            rules = pred.get('matched_rules') or []
            res = pred.get('result', 'pending')

            if isinstance(rules, str):
                rules = [rules]
            if isinstance(rules, list):
                for rule in rules:
                    key = str(rule)
                    if key not in rule_stats:
                        rule_stats[key] = {'total': 0, 'won': 0, 'lost': 0, 'pending': 0}

                    rule_stats[key]['total'] += 1
                    if res == 'won':
                        rule_stats[key]['won'] += 1
                    elif res == 'lost':
                        rule_stats[key]['lost'] += 1
                    else:
                        rule_stats[key]['pending'] += 1

        return rule_stats

    def _calculate_daily_breakdown(self, predictions: List[Dict]) -> List[Dict]:
        """Calculate daily prediction breakdown."""
        daily: Dict[str, Dict] = {}

        for pred in predictions:
            date_str = pred.get('created_at', '')[:10]
            if not date_str:
                continue

            if date_str not in daily:
                daily[date_str] = {'date': date_str, 'total': 0, 'won': 0, 'lost': 0, 'pending': 0}

            daily[date_str]['total'] += 1
            res = pred.get('result', 'pending')
            if res == 'won':
                daily[date_str]['won'] += 1
            elif res == 'lost':
                daily[date_str]['lost'] += 1
            else:
                daily[date_str]['pending'] += 1

        # Sort by date descending
        result = sorted(daily.values(), key=lambda x: x['date'], reverse=True)

        # Add win rates
        for day in result:
            finished = day['won'] + day['lost']
            day['win_rate'] = round(day['won'] / finished * 100, 2) if finished > 0 else 0

        return result

    def _empty_stats(self) -> Dict[str, Any]:
        """Return empty statistics structure."""
        return {
            'total_predictions': 0,
            'days_analyzed': 0,
            'overall': {
                'total': 0, 'won': 0, 'lost': 0, 'pending': 0,
                'finished': 0, 'win_rate': 0, 'avg_confidence': 0
            },
            'rule_stats': {},
            'daily_breakdown': []
        }


if __name__ == "__main__":
    """Test prediction analytics"""
    logging.basicConfig(level=logging.INFO)

    analytics = PredictionAnalytics()

    print("=" * 60)
    print("PREDICTION ANALYTICS")
    print("=" * 60)

    # All-time stats
    stats = analytics.get_statistics(days_back=0)
    overall = stats['overall']

    print(f"\nTotal Predictions: {overall['total']}")
    print(f"Won: {overall['won']}")
    print(f"Lost: {overall['lost']}")
    print(f"Pending: {overall['pending']}")
    print(f"Win Rate: {overall['win_rate']}%")
    print(f"Avg Confidence: {overall['avg_confidence']}%")

    # Rule performance
    print(f"\nRule Performance (min 3 finished):")
    rules = analytics.analyze_rule_performance(min_sample=3)
    for rule in rules[:10]:
        print(f"  Rule {rule['rule_id']}: {rule['win_rate']}% "
              f"({rule['won']}/{rule['finished']}) avg conf: {rule['avg_confidence']}%")
