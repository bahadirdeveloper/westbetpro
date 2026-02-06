"""
Matches Routes
Monitor matches (upcoming, today, past)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Optional
from datetime import datetime, timedelta

from api.middleware.auth import require_admin_role

router = APIRouter(prefix="/api/matches", tags=["Matches"])


@router.get("/")
async def get_matches(
    filter_type: str = Query("upcoming", pattern="^(upcoming|today|past)$"),
    league: Optional[str] = None,
    min_confidence: Optional[int] = None,
    limit: int = 100,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get matches with filters
    """
    try:
        from db import get_client
        db = get_client()

        # Build query
        query = db.client.table('matches').select('*')

        # Date filters
        today = datetime.utcnow().strftime('%Y-%m-%d')

        if filter_type == "today":
            query = query.eq('match_date', today)
        elif filter_type == "upcoming":
            query = query.gte('match_date', today)
        elif filter_type == "past":
            query = query.lt('match_date', today)

        # League filter
        if league:
            query = query.eq('league', league)

        # Order and limit
        query = query.order('match_date').limit(limit)

        result = query.execute()

        return {
            'success': True,
            'count': len(result.data),
            'matches': result.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_match_stats(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get match statistics
    """
    try:
        from db import get_client
        db = get_client()

        today = datetime.utcnow().strftime('%Y-%m-%d')

        # Total matches
        total = db.get_table_count('matches')

        # Today matches
        today_result = db.client.table('matches').select(
            'id', count='exact'
        ).eq('match_date', today).execute()

        # Upcoming matches (next 7 days)
        next_week = (datetime.utcnow() + timedelta(days=7)).strftime('%Y-%m-%d')
        upcoming_result = db.client.table('matches').select(
            'id', count='exact'
        ).gte('match_date', today).lte('match_date', next_week).execute()

        return {
            'success': True,
            'total_matches': total,
            'today_matches': today_result.count or 0,
            'upcoming_7_days': upcoming_result.count or 0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
