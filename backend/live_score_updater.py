"""
Live Score Updater
Automatically updates opportunities JSON files with live scores from API-Football
Runs periodically via scheduler - no manual intervention needed
"""

import json
import os
import logging
from datetime import datetime
from typing import Dict, List

from api_football import (
    enrich_opportunities_with_scores,
    get_live_fixtures,
    HEADERS,
    BASE_URL
)

logger = logging.getLogger(__name__)

# Data directory (relative to project root)
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')


def get_today_date_str() -> str:
    """Get today's date in YYYY-MM-DD format"""
    return datetime.now().strftime('%Y-%m-%d')


def load_opportunities(filename: str) -> List[Dict]:
    """Load opportunities from JSON file"""
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f"File not found: {filepath}")
        return []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'opportunities' in data:
            return data['opportunities']
        return []
    except Exception as e:
        logger.error(f"Error loading {filename}: {e}")
        return []


def save_opportunities(filename: str, opportunities: List[Dict]) -> bool:
    """Save updated opportunities back to JSON file"""
    filepath = os.path.join(DATA_DIR, filename)

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(opportunities, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving {filename}: {e}")
        return False


def has_active_matches(opportunities: List[Dict]) -> bool:
    """Check if there are any live or not-yet-finished matches"""
    for opp in opportunities:
        if opp.get('is_live', False):
            return True
        if not opp.get('is_finished', False):
            return True
    return False


def update_live_scores() -> Dict:
    """
    Main function: Update today's opportunities with live scores

    Returns:
        Dict with update results
    """
    result = {
        'success': False,
        'updated_at': datetime.now().isoformat(),
        'total_opportunities': 0,
        'live_matches': 0,
        'finished_matches': 0,
        'api_calls': 0,
        'skipped': False
    }

    try:
        # Load today's opportunities
        opportunities = load_opportunities('opportunities_today.json')

        if not opportunities:
            logger.info("No opportunities to update")
            result['success'] = True
            result['skipped'] = True
            return result

        result['total_opportunities'] = len(opportunities)

        # Check if all matches are already finished
        if not has_active_matches(opportunities):
            logger.info("All matches finished, skipping update")
            result['success'] = True
            result['skipped'] = True
            return result

        # Get today's date for API call
        today = get_today_date_str()

        # Enrich opportunities with live scores (makes 2 API calls: fixtures + live)
        updated_opportunities = enrich_opportunities_with_scores(opportunities, today)
        result['api_calls'] = 2  # get_fixtures_by_date + get_live_fixtures

        # Count live and finished
        for opp in updated_opportunities:
            if opp.get('is_live', False):
                result['live_matches'] += 1
            if opp.get('is_finished', False):
                result['finished_matches'] += 1

        # Save updated data
        if save_opportunities('opportunities_today.json', updated_opportunities):
            result['success'] = True
            logger.info(
                f"Live scores updated: {result['live_matches']} live, "
                f"{result['finished_matches']} finished out of {result['total_opportunities']}"
            )
        else:
            result['success'] = False
            logger.error("Failed to save updated opportunities")

        return result

    except Exception as e:
        logger.error(f"Error updating live scores: {e}")
        result['success'] = False
        result['error'] = str(e)
        return result


def get_api_usage() -> Dict:
    """
    Check API-Football daily usage/limits

    API-Football returns usage info in response headers:
    - x-ratelimit-requests-limit: Daily limit
    - x-ratelimit-requests-remaining: Remaining requests

    Returns:
        Dict with usage info
    """
    import requests

    try:
        # Use /status endpoint (lightweight, counts as 0 API calls in most plans)
        url = f"{BASE_URL}/status"
        response = requests.get(url, headers=HEADERS, timeout=10)

        # Extract rate limit headers
        limit = response.headers.get('x-ratelimit-requests-limit', 'N/A')
        remaining = response.headers.get('x-ratelimit-requests-remaining', 'N/A')

        # Parse response body for subscription info
        data = response.json()
        account = data.get('response', {}).get('account', {})
        subscription = data.get('response', {}).get('subscription', {})
        requests_info = data.get('response', {}).get('requests', {})

        return {
            'success': True,
            'daily_limit': int(limit) if limit != 'N/A' else requests_info.get('limit_day', 0),
            'remaining': int(remaining) if remaining != 'N/A' else (
                requests_info.get('limit_day', 0) - requests_info.get('current', 0)
            ),
            'used_today': requests_info.get('current', 0),
            'plan': subscription.get('plan', 'Unknown'),
            'active': subscription.get('active', False),
            'firstname': account.get('firstname', ''),
            'lastname': account.get('lastname', ''),
            'checked_at': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error checking API usage: {e}")
        return {
            'success': False,
            'error': str(e),
            'daily_limit': 0,
            'remaining': 0,
            'used_today': 0,
            'plan': 'Unknown',
            'checked_at': datetime.now().isoformat()
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    print("=" * 50)
    print("Testing Live Score Updater")
    print("=" * 50)

    # Test API usage
    print("\n📊 API Usage:")
    usage = get_api_usage()
    print(f"  Plan: {usage['plan']}")
    print(f"  Daily Limit: {usage['daily_limit']}")
    print(f"  Used Today: {usage['used_today']}")
    print(f"  Remaining: {usage['remaining']}")

    # Test live score update
    print("\n⚽ Updating live scores...")
    result = update_live_scores()
    print(f"  Success: {result['success']}")
    print(f"  Total: {result['total_opportunities']}")
    print(f"  Live: {result['live_matches']}")
    print(f"  Finished: {result['finished_matches']}")
    print(f"  API Calls: {result['api_calls']}")
