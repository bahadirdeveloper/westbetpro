"""
Upload Routes
Excel file upload and processing
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict
import os
import shutil
from datetime import datetime

from api.middleware.auth import require_admin_role
from api.services.excel_parser import parse_excel_file, insert_matches_to_db

router = APIRouter(prefix="/api/upload", tags=["Upload"])

# Upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/excel")
async def upload_excel(
    file: UploadFile = File(...),
    user = Depends(require_admin_role)
) -> Dict:
    """
    Upload and process Excel file
    Admin-only endpoint
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=400,
                detail="Only Excel files (.xlsx, .xls) are allowed"
            )

        # Save uploaded file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Parse Excel
        parse_result = parse_excel_file(file_path)

        if not parse_result['success']:
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': parse_result.get('error', 'Failed to parse Excel')
                }
            )

        # Insert to database
        insert_result = insert_matches_to_db(parse_result['matches'])

        # Clean up file (optional)
        # os.remove(file_path)

        return {
            'success': True,
            'filename': filename,
            'upload_time': timestamp,
            'parse_stats': {
                'total_rows': parse_result['total_rows'],
                'valid_matches': parse_result['valid_matches'],
                'matches_with_odds': parse_result['matches_with_odds']
            },
            'insert_stats': {
                'inserted': insert_result['inserted'],
                'duplicates': insert_result['duplicates'],
                'errors': insert_result['errors']
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_upload_history(
    limit: int = 10,
    user = Depends(require_admin_role)
) -> Dict:
    """
    Get upload history from system_logs
    """
    try:
        from db import get_client
        db = get_client()

        result = db.client.table('system_logs').select('*').eq(
            'event', 'matches_imported'
        ).order('timestamp', desc=True).limit(limit).execute()

        return {
            'success': True,
            'uploads': result.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
