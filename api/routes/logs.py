"""
Logs Routes
System logs monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Optional

from api.middleware.auth import require_admin_role

router = APIRouter(prefix="/api/logs", tags=["Logs"])


@router.get("/")
async def get_logs(
    level: Optional[str] = Query(None, pattern="^(INFO|ERROR|WARNING)$"),
    event: Optional[str] = None,
    limit: int = 100,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get system logs with filters
    """
    try:
        from db import get_client
        db = get_client()

        # Build query
        query = db.client.table('system_logs').select('*')

        # Filters
        if level:
            query = query.eq('level', level)

        if event:
            query = query.eq('event', event)

        # Order and limit
        query = query.order('timestamp', desc=True).limit(limit)

        result = query.execute()

        return {
            'success': True,
            'count': len(result.data),
            'logs': result.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_log_stats(
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get log statistics
    """
    try:
        from db import get_client
        db = get_client()

        # Count by level
        total = db.get_table_count('system_logs')

        info_result = db.client.table('system_logs').select(
            'id', count='exact'
        ).eq('level', 'INFO').execute()

        error_result = db.client.table('system_logs').select(
            'id', count='exact'
        ).eq('level', 'ERROR').execute()

        warning_result = db.client.table('system_logs').select(
            'id', count='exact'
        ).eq('level', 'WARNING').execute()

        return {
            'success': True,
            'total_logs': total,
            'info_count': info_result.count or 0,
            'error_count': error_result.count or 0,
            'warning_count': warning_result.count or 0
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
