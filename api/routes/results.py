"""
Results Routes - Track match results and update predictions
Admin-only endpoints for result tracking
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict
from api.middleware.auth import require_admin_role
import sys
import os

# Add parent directory to path to access track_results module
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))
from track_results import ResultTracker

router = APIRouter(prefix="/api/results", tags=["Results"])


class TrackResultsRequest(BaseModel):
    days_back: int = 3


@router.post("/track")
async def track_results(
    request: TrackResultsRequest,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Track match results and update predictions
    Only admins can trigger this operation
    """
    try:
        tracker = ResultTracker()
        result = tracker.track_results(days_back=request.days_back)

        return {
            'success': True,
            'data': result,
            'triggered_by': user.get('email', 'unknown')
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to track results: {str(e)}"
        )


@router.get("/pending-count")
async def get_pending_count(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get count of predictions pending result update
    Returns count of predictions with result = 'pending'
    """
    try:
        tracker = ResultTracker()
        pending = tracker.get_pending_predictions(limit=1000)

        return {
            'success': True,
            'pending_count': len(pending),
            'predictions': pending[:10]  # Return first 10 for preview
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get pending count: {str(e)}"
        )


@router.get("/recent-results")
async def get_recent_results(
    days: int = 7,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get recently tracked results
    Shows predictions that were updated in the last N days
    """
    try:
        # Import db module
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        from db import get_client

        db = get_client()

        # Query predictions with recent result updates
        result = db.client.table('predictions').select(
            '*'
        ).neq(
            'result', 'pending'
        ).order(
            'created_at', desc=True
        ).limit(100).execute()

        predictions = result.data if result.data else []

        # Count by result
        won = sum(1 for p in predictions if p.get('result') == 'won')
        lost = sum(1 for p in predictions if p.get('result') == 'lost')

        return {
            'success': True,
            'total': len(predictions),
            'won': won,
            'lost': lost,
            'win_rate': round(won / len(predictions) * 100, 2) if predictions else 0,
            'predictions': predictions[:20]  # Return first 20
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get recent results: {str(e)}"
        )
