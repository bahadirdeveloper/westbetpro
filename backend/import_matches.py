"""
Excel to Supabase Match Importer
Production-ready script for one-time initial data import
"""

import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np
from dotenv import load_dotenv
import logging
import re

from db import get_client

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MatchImporter:
    """
    Excel match data importer with normalization and validation
    """

    def __init__(
        self,
        excel_path: str,
        sheet_name: str = 'Acilis',
        batch_size: int = 1000
    ):
        """
        Initialize importer

        Args:
            excel_path: Path to Excel file
            sheet_name: Sheet name to read
            batch_size: Batch size for database inserts
        """
        self.excel_path = excel_path
        self.sheet_name = sheet_name
        self.batch_size = batch_size
        self.db = get_client()

        # Column mapping (configure based on your Excel structure)
        self.column_mapping = {
            'Ev Sahibi': 'home_team',
            'Deplasman': 'away_team',
            'Lig': 'league',
            'Tarih': 'match_date',
            'Saat': 'match_time',
        }

    def normalize_team_name(self, team_name: str) -> str:
        """
        Normalize team name

        Args:
            team_name: Raw team name

        Returns:
            Normalized team name
        """
        if pd.isna(team_name):
            return ''

        # Convert to string and strip whitespace
        team = str(team_name).strip()

        # Remove extra spaces
        team = re.sub(r'\s+', ' ', team)

        # Capitalize properly
        team = team.title()

        return team

    def normalize_league_name(self, league_name: str) -> str:
        """
        Normalize league name

        Args:
            league_name: Raw league name

        Returns:
            Normalized league name
        """
        if pd.isna(league_name):
            return ''

        # Convert to string and strip
        league = str(league_name).strip()

        # Remove extra spaces
        league = re.sub(r'\s+', ' ', league)

        # Convert to uppercase for consistency
        league = league.upper()

        # Replace common variations
        replacements = {
            'PREMIER LIG': 'PREMIER_LIG',
            'PREMIER LEAGUE': 'PREMIER_LIG',
            'LA LIGA': 'LA_LIGA',
            'SERIE A': 'SERIE_A',
            'BUNDESLIGA': 'BUNDESLIGA',
            'LIGUE 1': 'LIGUE_1',
        }

        for old, new in replacements.items():
            if old in league:
                league = new
                break

        return league

    def normalize_date(self, date_value: Any) -> Optional[str]:
        """
        Normalize date to ISO format (YYYY-MM-DD)

        Args:
            date_value: Raw date value

        Returns:
            ISO format date string or None
        """
        if pd.isna(date_value):
            return None

        try:
            # If already datetime
            if isinstance(date_value, datetime):
                return date_value.strftime('%Y-%m-%d')

            # If string, try parsing
            date_str = str(date_value).strip()

            # Try DD.MM.YYYY format
            if '.' in date_str:
                parts = date_str.split('.')
                if len(parts) == 3:
                    day, month, year = parts
                    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

            # Try DD/MM/YYYY format
            if '/' in date_str:
                parts = date_str.split('/')
                if len(parts) == 3:
                    day, month, year = parts
                    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

            # Try pandas date parsing
            parsed_date = pd.to_datetime(date_str)
            return parsed_date.strftime('%Y-%m-%d')

        except Exception as e:
            logger.warning(f"⚠️  Failed to parse date '{date_value}': {e}")
            return None

    def validate_match(self, match: Dict[str, Any]) -> bool:
        """
        Validate match data

        Args:
            match: Match dictionary

        Returns:
            True if valid
        """
        required_fields = ['home_team', 'away_team', 'league', 'match_date']

        for field in required_fields:
            if not match.get(field):
                logger.warning(
                    f"⚠️  Invalid match: missing {field} - {match}"
                )
                return False

        # Check that home and away teams are different
        if match['home_team'] == match['away_team']:
            logger.warning(
                f"⚠️  Invalid match: same home and away team - {match}"
            )
            return False

        return True

    def read_excel(self) -> pd.DataFrame:
        """
        Read Excel file

        Returns:
            DataFrame with match data
        """
        try:
            logger.info(f"📂 Reading Excel file: {self.excel_path}")

            # Read Excel
            df = pd.read_excel(
                self.excel_path,
                sheet_name=self.sheet_name
            )

            logger.info(f"✅ Loaded {len(df)} rows from Excel")
            logger.info(f"📋 Columns: {df.columns.tolist()[:10]}")

            return df

        except Exception as e:
            logger.error(f"❌ Failed to read Excel: {e}")
            raise

    def transform_data(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Transform and normalize Excel data

        Args:
            df: Raw DataFrame

        Returns:
            List of normalized match dictionaries
        """
        try:
            logger.info("🔄 Transforming and normalizing data...")

            matches = []
            skipped_count = 0

            for idx, row in df.iterrows():
                try:
                    # Extract and normalize fields
                    match = {}

                    # Map columns based on configuration
                    for excel_col, db_col in self.column_mapping.items():
                        if excel_col in row.index:
                            match[db_col] = row[excel_col]

                    # Normalize team names
                    if 'home_team' in match:
                        match['home_team'] = self.normalize_team_name(
                            match['home_team']
                        )

                    if 'away_team' in match:
                        match['away_team'] = self.normalize_team_name(
                            match['away_team']
                        )

                    # Normalize league
                    if 'league' in match:
                        match['league'] = self.normalize_league_name(
                            match['league']
                        )

                    # Normalize date
                    if 'match_date' in match:
                        match['match_date'] = self.normalize_date(
                            match['match_date']
                        )

                    # Add metadata
                    match['created_at'] = datetime.utcnow().isoformat()
                    match['updated_at'] = datetime.utcnow().isoformat()
                    match['source'] = 'excel_import'

                    # Validate
                    if self.validate_match(match):
                        matches.append(match)
                    else:
                        skipped_count += 1

                except Exception as e:
                    skipped_count += 1
                    logger.warning(f"⚠️  Skipped row {idx}: {e}")

            logger.info(
                f"✅ Transformed {len(matches)} valid matches "
                f"({skipped_count} skipped)"
            )

            return matches

        except Exception as e:
            logger.error(f"❌ Data transformation failed: {e}")
            raise

    def remove_duplicates(
        self,
        matches: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Remove duplicate matches from list

        Args:
            matches: List of match dictionaries

        Returns:
            List of unique matches
        """
        try:
            logger.info("🔄 Removing in-list duplicates...")

            # Create DataFrame for easier deduplication
            df = pd.DataFrame(matches)

            # Remove duplicates based on key columns
            df_unique = df.drop_duplicates(
                subset=['league', 'home_team', 'away_team', 'match_date'],
                keep='first'
            )

            unique_matches = df_unique.to_dict('records')

            duplicates_removed = len(matches) - len(unique_matches)
            logger.info(
                f"✅ Removed {duplicates_removed} in-list duplicates"
            )

            return unique_matches

        except Exception as e:
            logger.error(f"❌ Deduplication failed: {e}")
            # Return original list if deduplication fails
            return matches

    def import_matches(self) -> Dict[str, Any]:
        """
        Execute full import pipeline

        Returns:
            Import statistics
        """
        try:
            logger.info("=" * 70)
            logger.info("🚀 STARTING MATCH IMPORT")
            logger.info("=" * 70)

            # Step 1: Read Excel
            df = self.read_excel()

            # Step 2: Transform data
            matches = self.transform_data(df)

            if not matches:
                logger.warning("⚠️  No valid matches to import")
                return {
                    'success': False,
                    'error': 'No valid matches found',
                    'total': 0,
                    'inserted': 0
                }

            # Step 3: Remove in-list duplicates
            unique_matches = self.remove_duplicates(matches)

            # Step 4: Insert into database
            result = self.db.insert_matches(
                unique_matches,
                batch_size=self.batch_size
            )

            # Step 5: Log final summary
            logger.info("=" * 70)
            logger.info("✅ IMPORT COMPLETE")
            logger.info("=" * 70)
            logger.info(f"📊 Total processed: {result['total']}")
            logger.info(f"✅ Inserted: {result['inserted']}")
            logger.info(f"🔄 Duplicates skipped: {result['duplicates']}")
            logger.info(f"❌ Errors: {result['errors']}")
            logger.info("=" * 70)

            return result

        except Exception as e:
            logger.error(f"❌ Import failed: {e}")

            # Log error to database
            self.db.log_system_event(
                level='ERROR',
                event='import_matches_failed',
                details={'error': str(e)}
            )

            return {
                'success': False,
                'error': str(e),
                'total': 0,
                'inserted': 0
            }


def main():
    """Main entry point"""
    # Get configuration from environment
    excel_path = os.getenv('EXCEL_FILE_PATH', 'Excel-Açılış-Bilgisayar (10).xlsx')
    sheet_name = os.getenv('EXCEL_SHEET_NAME', 'Acilis')
    batch_size = int(os.getenv('BATCH_SIZE', 1000))

    # Check if file exists
    if not os.path.exists(excel_path):
        logger.error(f"❌ Excel file not found: {excel_path}")
        sys.exit(1)

    # Test database connection first
    logger.info("🔍 Testing database connection...")
    if not get_client().test_connection():
        logger.error("❌ Database connection failed. Check your .env file.")
        sys.exit(1)

    # Create importer
    importer = MatchImporter(
        excel_path=excel_path,
        sheet_name=sheet_name,
        batch_size=batch_size
    )

    # Execute import
    result = importer.import_matches()

    # Exit with appropriate code
    if result['success']:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
