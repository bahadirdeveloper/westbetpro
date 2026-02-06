"""
Admin Analytics Routes - Advanced analytics for admin dashboard
Provides detailed statistics and rule performance metrics
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, List
from api.middleware.auth import require_admin_role
import sys
import os

# Add parent directory to path to access analyze_predictions module
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))
from analyze_predictions import PredictionAnalytics

router = APIRouter(prefix="/api/admin/analytics", tags=["Admin Analytics"])


@router.get("/detailed")
async def get_detailed_analytics(
    days_back: int = Query(7, ge=0, le=365),
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get comprehensive prediction analytics
    Includes overall stats, rule performance, and trends
    """
    try:
        analytics = PredictionAnalytics()
        stats = analytics.get_statistics(days_back=days_back)

        return {
            'success': True,
            'days_back': days_back,
            'analytics': stats
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get analytics: {str(e)}"
        )


@router.get("/rule-performance")
async def get_rule_performance(
    min_predictions: int = Query(3, ge=1, description="Minimum finished predictions required"),
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get detailed rule performance with win rates
    Filters rules by minimum sample size
    """
    try:
        analytics = PredictionAnalytics()
        stats = analytics.get_statistics(days_back=0)
        rule_stats = stats.get('rule_stats', {})

        detailed_rules = []
        for key, data in rule_stats.items():
            finished = data['won'] + data['lost']
            if finished >= min_predictions:
                # Parse rule_id and name from key
                parts = key.split('_', 1)
                rule_id = parts[0] if len(parts) > 0 else 'unknown'
                rule_name = parts[1] if len(parts) > 1 else key

                detailed_rules.append({
                    'rule_id': rule_id,
                    'rule_name': rule_name,
                    'total_predictions': data['total'],
                    'won': data['won'],
                    'lost': data['lost'],
                    'pending': data['pending'],
                    'win_rate': round((data['won'] / finished * 100), 2) if finished > 0 else 0,
                    'sample_size': finished,
                    'status': 'excellent' if (data['won'] / finished * 100) >= 70 else
                             'good' if (data['won'] / finished * 100) >= 60 else
                             'warning' if (data['won'] / finished * 100) >= 50 else
                             'poor'
                })

        # Sort by sample size first, then by win rate
        detailed_rules.sort(key=lambda x: (x['sample_size'], x['win_rate']), reverse=True)

        return {
            'success': True,
            'total_rules': len(detailed_rules),
            'min_predictions': min_predictions,
            'rules': detailed_rules
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get rule performance: {str(e)}"
        )


@router.get("/overview")
async def get_overview(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get quick overview stats for dashboard
    Returns high-level metrics without detailed breakdown
    """
    try:
        # Import db module
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        from db import get_client

        db = get_client()

        # Get total matches count (last 7 days)
        from datetime import datetime, timedelta
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()

        matches_result = db.client.table('matches').select(
            'id', count='exact'
        ).gte('date', seven_days_ago).execute()

        # Get predictions stats
        predictions_result = db.client.table('predictions').select(
            'result, confidence'
        ).execute()

        predictions = predictions_result.data if predictions_result.data else []

        total_predictions = len(predictions)
        high_confidence = sum(1 for p in predictions if p.get('confidence', 0) >= 90)
        pending = sum(1 for p in predictions if p.get('result') == 'pending')
        won = sum(1 for p in predictions if p.get('result') == 'won')
        lost = sum(1 for p in predictions if p.get('result') == 'lost')
        finished = won + lost

        # Get last engine run
        runs_result = db.client.table('runs').select(
            'status, created_at, opportunities_found'
        ).order('created_at', desc=True).limit(1).execute()

        last_run = runs_result.data[0] if runs_result.data else None

        # Count opportunities in last 24h
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        recent_predictions = db.client.table('predictions').select(
            'id', count='exact'
        ).gte('created_at', yesterday).execute()

        return {
            'success': True,
            'overview': {
                'total_matches_7d': matches_result.count if hasattr(matches_result, 'count') else 0,
                'total_predictions': total_predictions,
                'high_confidence_predictions': high_confidence,
                'pending_predictions': pending,
                'finished_predictions': finished,
                'won': won,
                'lost': lost,
                'win_rate': round(won / finished * 100, 2) if finished > 0 else 0,
                'opportunities_24h': recent_predictions.count if hasattr(recent_predictions, 'count') else 0,
                'last_run': {
                    'status': last_run.get('status') if last_run else None,
                    'created_at': last_run.get('created_at') if last_run else None,
                    'opportunities_found': last_run.get('opportunities_found') if last_run else 0
                } if last_run else None
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get overview: {str(e)}"
        )


@router.get("/confidence-distribution")
async def get_confidence_distribution(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get distribution of predictions by confidence level
    Groups predictions into confidence buckets
    """
    try:
        # Import db module
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        from db import get_client

        db = get_client()

        predictions_result = db.client.table('predictions').select(
            'confidence, result'
        ).execute()

        predictions = predictions_result.data if predictions_result.data else []

        # Group by confidence buckets
        buckets = {
            '90-100': {'total': 0, 'won': 0, 'lost': 0, 'pending': 0},
            '80-89': {'total': 0, 'won': 0, 'lost': 0, 'pending': 0},
            '70-79': {'total': 0, 'won': 0, 'lost': 0, 'pending': 0},
            '60-69': {'total': 0, 'won': 0, 'lost': 0, 'pending': 0},
            '<60': {'total': 0, 'won': 0, 'lost': 0, 'pending': 0}
        }

        for pred in predictions:
            conf = pred.get('confidence', 0)
            result = pred.get('result', 'pending')

            bucket = ('90-100' if conf >= 90 else
                     '80-89' if conf >= 80 else
                     '70-79' if conf >= 70 else
                     '60-69' if conf >= 60 else
                     '<60')

            buckets[bucket]['total'] += 1
            if result == 'won':
                buckets[bucket]['won'] += 1
            elif result == 'lost':
                buckets[bucket]['lost'] += 1
            else:
                buckets[bucket]['pending'] += 1

        # Calculate win rates
        for bucket_data in buckets.values():
            finished = bucket_data['won'] + bucket_data['lost']
            bucket_data['win_rate'] = round(bucket_data['won'] / finished * 100, 2) if finished > 0 else 0

        return {
            'success': True,
            'distribution': buckets
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get confidence distribution: {str(e)}"
        )
