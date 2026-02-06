"""
API-Football (RapidAPI) Integration
Live scores, match status, and results
"""

import requests
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

API_KEY = "7bae9873ea873999fe45937343f43628"
BASE_URL = "https://v3.football.api-sports.io"

HEADERS = {
    "x-rapidapi-key": API_KEY,
    "x-rapidapi-host": "v3.football.api-sports.io"
}


def get_fixtures_by_date(date: str) -> List[Dict]:
    """
    Get all fixtures for a specific date

    Args:
        date: Date in YYYY-MM-DD format

    Returns:
        List of fixture dictionaries
    """
    try:
        url = f"{BASE_URL}/fixtures"
        params = {"date": date}

        response = requests.get(url, headers=HEADERS, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        if data.get("results", 0) > 0:
            return data.get("response", [])
        return []

    except Exception as e:
        logger.error(f"Error fetching fixtures: {e}")
        return []


def get_live_fixtures() -> List[Dict]:
    """
    Get all live fixtures

    Returns:
        List of live fixture dictionaries
    """
    try:
        url = f"{BASE_URL}/fixtures"
        params = {"live": "all"}

        response = requests.get(url, headers=HEADERS, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        if data.get("results", 0) > 0:
            return data.get("response", [])
        return []

    except Exception as e:
        logger.error(f"Error fetching live fixtures: {e}")
        return []


def match_fixture_by_teams(fixtures: List[Dict], home_team: str, away_team: str) -> Optional[Dict]:
    """
    Find fixture by team names (improved fuzzy matching)

    Args:
        fixtures: List of fixture dictionaries
        home_team: Home team name
        away_team: Away team name

    Returns:
        Matching fixture or None
    """
    def normalize(name: str) -> str:
        """Normalize team name for matching"""
        # Convert to lowercase
        name = name.lower().strip()

        # Turkish character normalization (CRITICAL for matching Turkish team names)
        turkish_chars = {
            'ı': 'i', 'i̇': 'i', 'İ': 'i',  # Turkish dotted/dotless i
            'ğ': 'g', 'Ğ': 'g',
            'ü': 'u', 'Ü': 'u',
            'ş': 's', 'Ş': 's',
            'ö': 'o', 'Ö': 'o',
            'ç': 'c', 'Ç': 'c'
        }
        for tr_char, ascii_char in turkish_chars.items():
            name = name.replace(tr_char, ascii_char)

        # Remove common words
        for word in [' fc', ' cf', ' sc', ' ac', ' club', ' united', ' city', ' f.', ' f ']:
            name = name.replace(word, '')
        # Remove hyphens, dots, spaces
        name = name.replace('-', '').replace('.', '').replace(' ', '')
        return name

    def get_key_words(name: str) -> set:
        """Extract key words from team name"""
        name = name.lower().strip()

        # Turkish character normalization
        turkish_chars = {
            'ı': 'i', 'i̇': 'i', 'İ': 'i',
            'ğ': 'g', 'Ğ': 'g',
            'ü': 'u', 'Ü': 'u',
            'ş': 's', 'Ş': 's',
            'ö': 'o', 'Ö': 'o',
            'ç': 'c', 'Ç': 'c'
        }
        for tr_char, ascii_char in turkish_chars.items():
            name = name.replace(tr_char, ascii_char)

        # Split by space and hyphen
        words = name.replace('-', ' ').replace('.', ' ').split()
        # Remove short words and common terms
        words = [w for w in words if len(w) > 2 and w not in ['the', 'fc', 'cf', 'sc', 'ac', 'f']]
        return set(words)

    home_norm = normalize(home_team)
    away_norm = normalize(away_team)
    home_words = get_key_words(home_team)
    away_words = get_key_words(away_team)

    best_match = None
    best_score = 0

    for fixture in fixtures:
        api_home = fixture["teams"]["home"]["name"]
        api_away = fixture["teams"]["away"]["name"]

        api_home_norm = normalize(api_home)
        api_away_norm = normalize(api_away)
        api_home_words = get_key_words(api_home)
        api_away_words = get_key_words(api_away)  # FIXED: was using away_team instead of api_away

        home_score = 0
        away_score = 0

        # Exact normalized match (highest priority)
        if home_norm == api_home_norm and away_norm == api_away_norm:
            return fixture

        # Partial match in normalized names - must be substantial
        if home_norm in api_home_norm or api_home_norm in home_norm:
            # Only count if match is substantial (at least 4 chars)
            if len(home_norm) >= 4 and (len(home_norm) >= 4 or len(api_home_norm) >= 4):
                home_score += 2
        if away_norm in api_away_norm or api_away_norm in away_norm:
            if len(away_norm) >= 4 and (len(away_norm) >= 4 or len(api_away_norm) >= 4):
                away_score += 2

        # Word overlap
        home_overlap = len(home_words & api_home_words)
        away_overlap = len(away_words & api_away_words)
        home_score += home_overlap
        away_score += away_overlap

        # CRITICAL: Both teams must have a match score of at least 1
        # This prevents matching unrelated teams
        if home_score >= 1 and away_score >= 1:
            total_score = home_score + away_score
            if total_score > best_score:
                best_score = total_score
                best_match = fixture

    return best_match


def get_match_by_teams_and_date(home_team: str, away_team: str, match_date: str) -> Optional[Dict]:
    """
    Get match result by team names and date

    Args:
        home_team: Home team name
        away_team: Away team name
        match_date: Match date in YYYY-MM-DD format or ISO format

    Returns:
        Dictionary with match result or None if not found/not finished
    """
    try:
        # Extract date from ISO format if needed
        if 'T' in match_date or ' ' in match_date:
            date_str = match_date.split('T')[0].split(' ')[0]
        else:
            date_str = match_date

        # Get fixtures for that date
        fixtures = get_fixtures_by_date(date_str)

        if not fixtures:
            logger.warning(f"No fixtures found for date {date_str}")
            return None

        # Find match by teams
        match = match_fixture_by_teams(fixtures, home_team, away_team)

        if not match:
            logger.warning(f"Match not found: {home_team} vs {away_team} on {date_str}")
            return None

        # Get match status and scores
        match_status = get_match_status(match)

        # Only return finished matches
        if not match_status['is_finished']:
            logger.info(f"Match not finished yet: {home_team} vs {away_team}")
            return None

        return {
            'home_team': match['teams']['home']['name'],
            'away_team': match['teams']['away']['name'],
            'fulltime_home': match_status['home_score'],
            'fulltime_away': match_status['away_score'],
            'halftime_home': match_status['halftime_home'],
            'halftime_away': match_status['halftime_away'],
            'status': match_status['status'],
            'is_finished': match_status['is_finished'],
            'match_date': date_str,
            'fixture_id': match['fixture']['id']
        }

    except Exception as e:
        logger.error(f"Error getting match result: {e}")
        return None


def get_match_status(fixture: Dict) -> Dict:
    """
    Extract match status, score, and elapsed time

    Args:
        fixture: Fixture dictionary from API

    Returns:
        Dictionary with status, score, elapsed time, halftime score
    """
    status = fixture["fixture"]["status"]["short"]
    elapsed = fixture["fixture"]["status"]["elapsed"]

    home_score = fixture["goals"]["home"]
    away_score = fixture["goals"]["away"]

    # Halftime score
    halftime = fixture.get("score", {}).get("halftime", {})
    halftime_home = halftime.get("home") if halftime else None
    halftime_away = halftime.get("away") if halftime else None

    # Status mapping
    status_map = {
        "TBD": "not_started",  # Time To Be Defined
        "NS": "not_started",   # Not Started
        "1H": "live",          # First Half
        "HT": "halftime",      # Half Time
        "2H": "live",          # Second Half
        "ET": "live",          # Extra Time
        "P": "live",           # Penalty
        "FT": "finished",      # Full Time
        "AET": "finished",     # After Extra Time
        "PEN": "finished",     # Penalty Shootout
        "BT": "finished",      # Break Time
        "SUSP": "suspended",   # Suspended
        "INT": "interrupted",  # Interrupted
        "PST": "postponed",    # Postponed
        "CANC": "cancelled",   # Cancelled
        "ABD": "abandoned",    # Abandoned
        "AWD": "awarded",      # Technical Loss
        "WO": "walkover",      # WalkOver
        "LIVE": "live"         # In Progress
    }

    return {
        "status": status_map.get(status, "unknown"),
        "status_short": status,
        "home_score": home_score if home_score is not None else 0,
        "away_score": away_score if away_score is not None else 0,
        "halftime_home": halftime_home,
        "halftime_away": halftime_away,
        "elapsed": elapsed,
        "is_live": status_map.get(status) == "live",
        "is_finished": status_map.get(status) == "finished"
    }


def check_prediction_result(
    prediction: str,
    home_score: int,
    away_score: int,
    halftime_home: Optional[int] = None,
    halftime_away: Optional[int] = None
) -> Optional[bool]:
    """
    Check if prediction was correct

    Supports predictions like:
    - MS 1.5 ÜST (total goals over)
    - İY 0.5 ÜST (halftime goals over)
    - MS EV 1.5 ÜST (home team goals over)
    - İY DEP 0.5 ÜST (away team halftime goals over)
    - KG VAR (both teams scored)

    Args:
        prediction: Prediction string (e.g., "MS 1.5 ÜST", "İY 0.5 ÜST")
        home_score: Home team full time score
        away_score: Away team full time score
        halftime_home: Home team halftime score
        halftime_away: Away team halftime score

    Returns:
        True if correct, False if wrong, None if cannot determine
    """
    try:
        total_goals = home_score + away_score

        # MS (Maç Skoru) predictions - Full Time
        if "MS" in prediction:
            parts = prediction.split()

            # Check for team-specific predictions (MS EV, MS DEP)
            if "EV" in parts:
                # Home team specific (e.g., "MS EV 1.5 ÜST")
                for i, part in enumerate(parts):
                    if part == "EV" and i + 1 < len(parts):
                        try:
                            threshold = float(parts[i + 1])
                            if "ÜST" in prediction:
                                return home_score > threshold
                            elif "ALT" in prediction:
                                return home_score < threshold
                        except ValueError:
                            continue
            elif "DEP" in parts:
                # Away team specific (e.g., "MS DEP 0.5 ÜST")
                for i, part in enumerate(parts):
                    if part == "DEP" and i + 1 < len(parts):
                        try:
                            threshold = float(parts[i + 1])
                            if "ÜST" in prediction:
                                return away_score > threshold
                            elif "ALT" in prediction:
                                return away_score < threshold
                        except ValueError:
                            continue
            else:
                # Total goals (e.g., "MS 1.5 ÜST")
                for i, part in enumerate(parts):
                    if part == "MS" and i + 1 < len(parts):
                        try:
                            threshold = float(parts[i + 1])
                            if "ÜST" in prediction:
                                return total_goals > threshold
                            elif "ALT" in prediction:
                                return total_goals < threshold
                        except ValueError:
                            continue

        # İY (İlk Yarı) predictions - Halftime
        if "İY" in prediction or "IY" in prediction:
            if halftime_home is None or halftime_away is None:
                return None  # Cannot check without halftime score

            halftime_total = halftime_home + halftime_away
            parts = prediction.split()

            # Check for team-specific predictions (İY EV, İY DEP)
            if "EV" in parts:
                # Home team halftime (e.g., "İY EV 0.5 ÜST")
                for i, part in enumerate(parts):
                    if part == "EV" and i + 1 < len(parts):
                        try:
                            threshold = float(parts[i + 1])
                            if "ÜST" in prediction:
                                return halftime_home > threshold
                            elif "ALT" in prediction:
                                return halftime_home < threshold
                        except ValueError:
                            continue
            elif "DEP" in parts:
                # Away team halftime (e.g., "İY DEP 0.5 ÜST")
                for i, part in enumerate(parts):
                    if part == "DEP" and i + 1 < len(parts):
                        try:
                            threshold = float(parts[i + 1])
                            if "ÜST" in prediction:
                                return halftime_away > threshold
                            elif "ALT" in prediction:
                                return halftime_away < threshold
                        except ValueError:
                            continue
            else:
                # Total halftime goals (e.g., "İY 0.5 ÜST")
                for i, part in enumerate(parts):
                    if (part == "İY" or part == "IY") and i + 1 < len(parts):
                        try:
                            threshold = float(parts[i + 1])
                            if "ÜST" in prediction:
                                return halftime_total > threshold
                            elif "ALT" in prediction:
                                return halftime_total < threshold
                        except ValueError:
                            continue

        # İY KG VAR (Karşılıklı Gol Var - Halftime)
        if ("İY" in prediction or "IY" in prediction) and ("KG VAR" in prediction or "VAR" in prediction):
            if halftime_home is None or halftime_away is None:
                return None
            return halftime_home > 0 and halftime_away > 0

        # KG VAR (Karşılıklı Gol Var)
        if "KG VAR" in prediction or "VAR" in prediction:
            return home_score > 0 and away_score > 0

        # 1X2 predictions
        if prediction == "1":
            return home_score > away_score
        if prediction == "X":
            return home_score == away_score
        if prediction == "2":
            return home_score < away_score

        return None

    except Exception as e:
        logger.error(f"Error checking prediction: {e}")
        return None


def enrich_opportunities_with_scores(opportunities: List[Dict], date: str) -> List[Dict]:
    """
    Enrich opportunities with live scores and match status

    Args:
        opportunities: List of opportunity dictionaries
        date: Date in YYYY-MM-DD format

    Returns:
        Enriched opportunities with scores
    """
    # Fetch all fixtures for the date
    fixtures = get_fixtures_by_date(date)

    # Also fetch live fixtures
    live_fixtures = get_live_fixtures()
    all_fixtures = fixtures + live_fixtures

    logger.info(f"Fetched {len(all_fixtures)} fixtures for date {date}")

    for opp in opportunities:
        home_team = opp.get("Ev Sahibi", "")
        away_team = opp.get("Deplasman", "")

        # Find matching fixture
        fixture = match_fixture_by_teams(all_fixtures, home_team, away_team)

        if fixture:
            match_status = get_match_status(fixture)

            # Add score and status to opportunity
            opp["live_status"] = match_status["status"]
            opp["home_score"] = match_status["home_score"]
            opp["away_score"] = match_status["away_score"]
            opp["halftime_home"] = match_status["halftime_home"]
            opp["halftime_away"] = match_status["halftime_away"]
            opp["elapsed"] = match_status["elapsed"]
            opp["is_live"] = match_status["is_live"]
            opp["is_finished"] = match_status["is_finished"]

            # Check prediction result if match is finished
            if match_status["is_finished"]:
                prediction = opp.get("best_prediction", "")
                result = check_prediction_result(
                    prediction,
                    match_status["home_score"],
                    match_status["away_score"],
                    match_status["halftime_home"],
                    match_status["halftime_away"]
                )
                opp["prediction_result"] = result  # True = won, False = lost, None = unknown

                # Check alternative predictions too
                if "alternatif_tahminler" in opp and opp["alternatif_tahminler"]:
                    for alt_pred in opp["alternatif_tahminler"]:
                        alt_prediction = alt_pred.get("tahmin", "")
                        alt_result = check_prediction_result(
                            alt_prediction,
                            match_status["home_score"],
                            match_status["away_score"],
                            match_status["halftime_home"],
                            match_status["halftime_away"]
                        )
                        alt_pred["sonuç"] = alt_result  # Add result to alternative prediction
        else:
            # No fixture found - set explicit defaults
            opp["live_status"] = "not_started"
            opp["home_score"] = None
            opp["away_score"] = None
            opp["halftime_home"] = None
            opp["halftime_away"] = None
            opp["elapsed"] = None
            opp["is_live"] = False
            opp["is_finished"] = False
            opp["prediction_result"] = None

    return opportunities


if __name__ == "__main__":
    # Test
    logging.basicConfig(level=logging.INFO)

    today = datetime.now().strftime("%Y-%m-%d")
    print(f"Testing API-Football for date: {today}")

    fixtures = get_fixtures_by_date(today)
    print(f"Found {len(fixtures)} fixtures")

    if fixtures:
        print("\nFirst 3 fixtures:")
        for fixture in fixtures[:3]:
            home = fixture["teams"]["home"]["name"]
            away = fixture["teams"]["away"]["name"]
            status = fixture["fixture"]["status"]["short"]
            print(f"  {home} vs {away} - {status}")
