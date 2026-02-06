"""
Engine Runner Service
Run opportunity engine programmatically
"""

import sys
import os
from datetime import datetime, timedelta
from typing import Dict

# backend/ is already on sys.path via api/main.py
from engine import SupabaseOpportunityEngine


def run_daily_engine(
    days_ahead: int = 3,
    min_confidence: int = 85,
    leagues: list = None
) -> Dict:
    """
    Run opportunity engine for upcoming matches

    Args:
        days_ahead: How many days ahead to process
        min_confidence: Minimum confidence threshold
        leagues: Optional league filter

    Returns:
        Run result summary
    """
    try:
        # Calculate date range
        date_from = datetime.utcnow().strftime('%Y-%m-%d')
        date_to = (datetime.utcnow() + timedelta(days=days_ahead)).strftime('%Y-%m-%d')

        # Create engine
        engine = SupabaseOpportunityEngine(
            min_confidence=min_confidence,
            days_ahead=days_ahead,
            skip_past_matches=True  # Only future matches
        )

        # Run engine
        result = engine.run(
            date_from=date_from,
            date_to=date_to,
            leagues=leagues
        )

        return {
            'success': result['success'],
            'run_id': result.get('run_id'),
            'matches_processed': result.get('matches_processed', 0),
            'opportunities_found': result.get('opportunities_found', 0),
            'date_range': f"{date_from} to {date_to}",
            'min_confidence': min_confidence,
            'error': result.get('error')
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'matches_processed': 0,
            'opportunities_found': 0
        }


def get_last_run_status() -> Dict:
    """
    Get status of last engine run from runs table

    Returns:
        Last run info
    """
    try:
        from db import get_client
        db = get_client()

        # Get most recent run
        result = db.client.table('runs').select('*').order(
            'started_at', desc=True
        ).limit(1).execute()

        if result.data:
            run = result.data[0]
            return {
                'success': True,
                'run_id': run['id'],
                'status': run['status'],
                'started_at': run['started_at'],
                'completed_at': run.get('completed_at'),
                'matches_processed': run.get('matches_processed', 0),
                'opportunities_found': run.get('opportunities_found', 0),
                'execution_time_ms': run.get('execution_time_ms'),
                'error_message': run.get('error_message')
            }
        else:
            return {
                'success': True,
                'message': 'No runs found'
            }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
