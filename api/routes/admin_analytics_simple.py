"""
Admin Analytics Routes (Simplified)
Provides overview statistics for admin dashboard
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from datetime import datetime, timedelta

from api.middleware.auth import require_admin_role

router = APIRouter(prefix="/api/admin/analytics", tags=["Admin Analytics"])


@router.get("/overview")
async def get_admin_overview(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get admin dashboard overview statistics
    """
    try:
        from db import get_client
        db = get_client()

        # Get predictions stats
        predictions_result = db.client.table('predictions').select('*').execute()
        predictions = predictions_result.data

        # Calculate stats
        total_predictions = len(predictions)
        high_confidence = len([p for p in predictions if p.get('confidence', 0) >= 90])
        pending = len([p for p in predictions if p.get('status') == 'active'])
        finished = len([p for p in predictions if p.get('status') in ['won', 'lost']])
        won = len([p for p in predictions if p.get('status') == 'won'])
        lost = len([p for p in predictions if p.get('status') == 'lost'])

        win_rate = round((won / finished * 100), 2) if finished > 0 else 0

        # Get matches from last 7 days
        seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
        matches_7d_result = db.client.table('matches').select(
            'id', count='exact'
        ).gte('created_at', seven_days_ago).execute()

        # Get opportunities in last 24h
        one_day_ago = (datetime.utcnow() - timedelta(days=1)).isoformat()
        opps_24h_result = db.client.table('predictions').select(
            'id', count='exact'
        ).gte('created_at', one_day_ago).execute()

        # Get last run
        last_run_result = db.client.table('runs').select('*').order(
            'started_at', desc=True
        ).limit(1).execute()

        last_run = None
        if last_run_result.data:
            run = last_run_result.data[0]
            last_run = {
                'status': run.get('status', 'unknown'),
                'created_at': run.get('started_at'),
                'opportunities_found': run.get('predictions_created', 0)
            }

        return {
            'success': True,
            'overview': {
                'total_matches_7d': matches_7d_result.count or 0,
                'total_predictions': total_predictions,
                'high_confidence_predictions': high_confidence,
                'pending_predictions': pending,
                'finished_predictions': finished,
                'won': won,
                'lost': lost,
                'win_rate': win_rate,
                'opportunities_24h': opps_24h_result.count or 0,
                'last_run': last_run
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
