"""
Analytics Routes
Rules performance and system analytics
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from collections import defaultdict

from api.middleware.auth import require_admin_role

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/rules-performance")
async def get_rules_performance(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get performance stats for all golden rules
    """
    try:
        from db import get_client
        from golden_rules import GOLDEN_RULES

        db = get_client()

        # Get all predictions
        predictions_result = db.client.table('predictions').select('*').execute()
        predictions = predictions_result.data

        # Aggregate by rule
        rule_stats = defaultdict(lambda: {
            'rule_id': None,
            'rule_name': None,
            'total_matches': 0,
            'total_predictions': 0,
            'won_count': 0,
            'lost_count': 0,
            'active_count': 0,
            'avg_confidence': 0,
            'success_rate': 0
        })

        for pred in predictions:
            matched_rules = pred.get('matched_rules', [])

            for rule in matched_rules:
                rule_id = rule.get('rule_id')
                rule_name = rule.get('rule_name')

                stats = rule_stats[rule_id]
                stats['rule_id'] = rule_id
                stats['rule_name'] = rule_name
                stats['total_predictions'] += 1

                if pred['status'] == 'won':
                    stats['won_count'] += 1
                elif pred['status'] == 'lost':
                    stats['lost_count'] += 1
                elif pred['status'] == 'active':
                    stats['active_count'] += 1

                stats['avg_confidence'] += pred['confidence']

        # Calculate success rate and average
        result_data = []
        for rule_id, stats in rule_stats.items():
            if stats['total_predictions'] > 0:
                stats['avg_confidence'] = round(
                    stats['avg_confidence'] / stats['total_predictions'],
                    2
                )

                total_completed = stats['won_count'] + stats['lost_count']
                if total_completed > 0:
                    stats['success_rate'] = round(
                        (stats['won_count'] / total_completed) * 100,
                        2
                    )

            result_data.append(stats)

        # Sort by total predictions
        result_data.sort(key=lambda x: x['total_predictions'], reverse=True)

        return {
            'success': True,
            'rules': result_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard-summary")
async def get_dashboard_summary(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get overall system summary for dashboard
    """
    try:
        from db import get_client
        db = get_client()

        # Counts
        total_matches = db.get_table_count('matches')
        total_predictions = db.get_table_count('predictions')
        total_runs = db.get_table_count('runs')

        # Last run
        last_run_result = db.client.table('runs').select('*').order(
            'started_at', desc=True
        ).limit(1).execute()

        last_run = last_run_result.data[0] if last_run_result.data else None

        # Active high-confidence predictions
        high_conf_result = db.client.table('predictions').select(
            'id', count='exact'
        ).gte('confidence', 90).eq('status', 'active').execute()

        return {
            'success': True,
            'summary': {
                'total_matches': total_matches,
                'total_predictions': total_predictions,
                'total_runs': total_runs,
                'high_confidence_active': high_conf_result.count or 0,
                'last_run': last_run
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
