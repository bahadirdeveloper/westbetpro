"""
API Usage Routes
Track API-Football daily usage and limits
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict

from api.middleware.auth import require_admin_role

router = APIRouter(prefix="/api/admin/api-usage", tags=["API Usage"])


@router.get("/status")
async def get_api_usage_status(
    user=Depends(require_admin_role)
) -> Dict:
    """
    Get API-Football usage statistics
    Shows daily limit, used, remaining
    """
    try:
        from live_score_updater import get_api_usage
        usage = get_api_usage()
        return usage

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-scores")
async def trigger_score_update(
    user=Depends(require_admin_role)
) -> Dict:
    """
    Manually trigger a live score update
    """
    try:
        from live_score_updater import update_live_scores
        result = update_live_scores()
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
