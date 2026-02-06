"""
Engine Routes
Control opportunity engine execution
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional, List

from api.middleware.auth import require_admin_role
from api.services.engine_runner import run_daily_engine, get_last_run_status

router = APIRouter(prefix="/api/engine", tags=["Engine"])


class RunEngineRequest(BaseModel):
    days_ahead: int = 3
    min_confidence: int = 85
    leagues: Optional[List[str]] = None


@router.post("/run")
async def run_engine(
    request: RunEngineRequest,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Manually trigger opportunity engine
    Admin-only endpoint
    """
    try:
        result = run_daily_engine(
            days_ahead=request.days_ahead,
            min_confidence=request.min_confidence,
            leagues=request.leagues
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_engine_status(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get last engine run status
    """
    try:
        result = get_last_run_status()
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs")
async def get_run_history(
    limit: int = 10,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get engine run history
    """
    try:
        from db import get_client
        db = get_client()

        result = db.client.table('runs').select('*').order(
            'started_at', desc=True
        ).limit(limit).execute()

        return {
            'success': True,
            'runs': result.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
