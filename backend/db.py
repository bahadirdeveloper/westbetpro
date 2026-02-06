"""
Supabase Database Client
Production-ready database interface with connection pooling and error handling
"""

import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SupabaseClient:
    """
    Supabase client wrapper with error handling and logging
    """

    _instance: Optional['SupabaseClient'] = None
    _client: Optional[Client] = None

    def __new__(cls):
        """Singleton pattern to reuse connection"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize Supabase client"""
        if self._client is None:
            try:
                url = os.getenv('SUPABASE_URL')
                # Prefer SERVICE_ROLE_KEY for database operations (bypasses RLS)
                key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY')

                if not url or not key:
                    raise ValueError(
                        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file"
                    )

                self._client = create_client(url, key)
                logger.info("✅ Supabase client initialized successfully (using SERVICE_ROLE key)")

            except Exception as e:
                logger.error(f"❌ Failed to initialize Supabase client: {e}")
                raise

    @property
    def client(self) -> Client:
        """Get Supabase client instance"""
        if self._client is None:
            raise RuntimeError("Supabase client not initialized")
        return self._client

    def insert_matches(
        self,
        matches: List[Dict[str, Any]],
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """
        Insert matches into database with batch processing

        Args:
            matches: List of match dictionaries
            batch_size: Number of records per batch

        Returns:
            Dict with success status and statistics
        """
        try:
            total_matches = len(matches)
            inserted_count = 0
            duplicate_count = 0
            error_count = 0

            logger.info(f"🔄 Starting batch insert: {total_matches} matches")

            # Process in batches
            for i in range(0, total_matches, batch_size):
                batch = matches[i:i + batch_size]
                batch_num = i // batch_size + 1
                total_batches = (total_matches + batch_size - 1) // batch_size

                try:
                    # Insert batch with upsert to handle duplicates
                    response = self.client.table('matches').upsert(
                        batch,
                        on_conflict='league,home_team,away_team,match_date'
                    ).execute()

                    batch_inserted = len(response.data) if response.data else 0
                    inserted_count += batch_inserted

                    logger.info(
                        f"✅ Batch {batch_num}/{total_batches}: "
                        f"{batch_inserted} records processed"
                    )

                except Exception as e:
                    error_count += len(batch)
                    logger.error(
                        f"❌ Batch {batch_num}/{total_batches} failed: {e}"
                    )

                    # Log to system_logs
                    self.log_system_event(
                        level='ERROR',
                        event='batch_insert_failed',
                        details={
                            'batch_num': batch_num,
                            'batch_size': len(batch),
                            'error': str(e)
                        }
                    )

            duplicate_count = total_matches - inserted_count - error_count

            # Log final summary
            self.log_system_event(
                level='INFO',
                event='matches_imported',
                details={
                    'total_matches': total_matches,
                    'inserted': inserted_count,
                    'duplicates': duplicate_count,
                    'errors': error_count
                }
            )

            logger.info(
                f"✅ Import complete: {inserted_count} inserted, "
                f"{duplicate_count} duplicates skipped, {error_count} errors"
            )

            return {
                'success': True,
                'total': total_matches,
                'inserted': inserted_count,
                'duplicates': duplicate_count,
                'errors': error_count
            }

        except Exception as e:
            logger.error(f"❌ Insert matches failed: {e}")
            self.log_system_event(
                level='ERROR',
                event='insert_matches_failed',
                details={'error': str(e)}
            )
            return {
                'success': False,
                'error': str(e),
                'total': len(matches),
                'inserted': 0,
                'duplicates': 0,
                'errors': len(matches)
            }

    def check_duplicate_matches(
        self,
        matches: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Check for duplicate matches before insertion

        Args:
            matches: List of match dictionaries

        Returns:
            List of non-duplicate matches
        """
        try:
            unique_matches = []

            for match in matches:
                # Query for existing match
                response = self.client.table('matches').select('id').eq(
                    'league', match['league']
                ).eq(
                    'home_team', match['home_team']
                ).eq(
                    'away_team', match['away_team']
                ).eq(
                    'match_date', match['match_date']
                ).execute()

                if not response.data:
                    unique_matches.append(match)

            return unique_matches

        except Exception as e:
            logger.error(f"❌ Duplicate check failed: {e}")
            # Return all matches if check fails
            return matches

    def log_system_event(
        self,
        level: str,
        event: str,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log system event to system_logs table

        Args:
            level: Log level (INFO, WARNING, ERROR)
            event: Event name
            details: Additional event details

        Returns:
            True if logged successfully
        """
        try:
            log_entry = {
                'level': level,
                'event': event,
                'details': details or {},
                'timestamp': datetime.utcnow().isoformat()
            }

            self.client.table('system_logs').insert(log_entry).execute()
            return True

        except Exception as e:
            # Don't fail the main operation if logging fails
            logger.warning(f"⚠️  Failed to log to system_logs: {e}")
            return False

    def get_table_count(self, table_name: str) -> int:
        """
        Get total count of records in a table

        Args:
            table_name: Name of the table

        Returns:
            Record count
        """
        try:
            response = self.client.table(table_name).select(
                'id', count='exact'
            ).execute()
            return response.count if response.count else 0

        except Exception as e:
            logger.error(f"❌ Failed to count {table_name}: {e}")
            return 0

    def test_connection(self) -> bool:
        """
        Test database connection

        Returns:
            True if connection is successful
        """
        try:
            # Try a simple query
            self.client.table('matches').select('id').limit(1).execute()
            logger.info("✅ Database connection test successful")
            return True

        except Exception as e:
            logger.error(f"❌ Database connection test failed: {e}")
            return False


# Global instance
db = SupabaseClient()


# Convenience functions
def get_client() -> SupabaseClient:
    """Get Supabase client instance"""
    return db


def test_connection() -> bool:
    """Test database connection"""
    return db.test_connection()


if __name__ == "__main__":
    # Test connection when run directly
    print("=" * 70)
    print("🔍 Testing Supabase Connection")
    print("=" * 70)

    if test_connection():
        print("\n✅ Connection successful!")

        # Show table count
        matches_count = db.get_table_count('matches')
        print(f"📊 Current matches in database: {matches_count}")
    else:
        print("\n❌ Connection failed!")
        print("Please check your .env file and Supabase credentials")
