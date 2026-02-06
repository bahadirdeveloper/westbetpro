"""
Predictions Routes
Monitor opportunities/predictions
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Optional

from api.middleware.auth import require_admin_role

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.get("/")
async def get_predictions(
    min_confidence: Optional[int] = None,
    status: str = Query("active", pattern="^(active|expired|won|lost)$"),
    sort_by: str = "confidence",
    limit: int = 100,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get predictions with filters
    """
    try:
        from db import get_client
        db = get_client()

        # Build query
        query = db.client.table('predictions').select('*')

        # Filters
        if min_confidence:
            query = query.gte('confidence', min_confidence)

        query = query.eq('status', status)

        # Sort
        if sort_by == "confidence":
            query = query.order('confidence', desc=True)
        elif sort_by == "date":
            query = query.order('match_date')

        query = query.limit(limit)

        result = query.execute()

        return {
            'success': True,
            'count': len(result.data),
            'predictions': result.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{prediction_id}")
async def get_prediction_detail(
    prediction_id: str,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get single prediction with full details
    """
    try:
        from db import get_client
        db = get_client()

        result = db.client.table('predictions').select('*').eq(
            'id', prediction_id
        ).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Prediction not found")

        return {
            'success': True,
            'prediction': result.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary")
async def get_prediction_stats(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get prediction statistics
    """
    try:
        from db import get_client
        db = get_client()

        # Total predictions
        total = db.get_table_count('predictions')

        # High confidence (>=90%)
        high_conf_result = db.client.table('predictions').select(
            'id', count='exact'
        ).gte('confidence', 90).execute()

        # Active predictions
        active_result = db.client.table('predictions').select(
            'id', count='exact'
        ).eq('status', 'active').execute()

        # Average confidence
        avg_result = db.client.table('predictions').select(
            'confidence'
        ).execute()

        avg_confidence = 0
        if avg_result.data:
            avg_confidence = sum(p['confidence'] for p in avg_result.data) / len(avg_result.data)

        return {
            'success': True,
            'total_predictions': total,
            'high_confidence_count': high_conf_result.count or 0,
            'active_count': active_result.count or 0,
            'average_confidence': round(avg_confidence, 2)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
