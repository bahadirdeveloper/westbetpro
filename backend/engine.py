"""
Opportunity Engine V2 - Supabase Integration
Production-ready engine that:
- Fetches matches from Supabase
- Filters today's/upcoming matches
- Applies golden rules
- Saves predictions to database
- Tracks runs and performance
- Logs everything
"""

import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import pandas as pd
from db import get_client
from golden_rules import GOLDEN_RULES, GoldenRule


class SupabaseOpportunityEngine:
    """
    Production-ready opportunity engine with Supabase integration
    """

    def __init__(self,
                 min_confidence: int = 85,
                 tolerance: float = 0.000,
                 days_ahead: int = 3,
                 skip_past_matches: bool = True):
        """
        Args:
            min_confidence: Minimum confidence score (0-100)
            tolerance: Odds matching tolerance (0.000 = exact match only, no tolerance)
            days_ahead: How many days ahead to fetch matches
            skip_past_matches: Skip matches that have already started (default True)
        """
        self.db = get_client()
        self.min_confidence = min_confidence
        self.tolerance = tolerance
        self.days_ahead = days_ahead
        self.skip_past_matches = skip_past_matches
        self.golden_rules = GOLDEN_RULES

        # Current run tracking
        self.current_run_id = None
        self.start_time = None

    def create_run(self, filters: Dict) -> str:
        """
        Create a new run record and start tracking

        Args:
            filters: Filter parameters used for this run

        Returns:
            run_id (UUID)
        """
        try:
            self.start_time = time.time()

            run_data = {
                'status': 'running',
                'started_at': datetime.utcnow().isoformat(),
                'filters': filters,
                'matches_processed': 0,
                'opportunities_found': 0
            }

            response = self.db.client.table('runs').insert(run_data).execute()
            self.current_run_id = response.data[0]['id']

            self.db.log_system_event(
                level='INFO',
                event='opportunity_engine_started',
                details={'run_id': self.current_run_id, 'filters': filters}
            )

            print(f"✅ Run başladı: {self.current_run_id}")
            return self.current_run_id

        except Exception as e:
            print(f"❌ Run oluşturulamadı: {e}")
            raise

    def complete_run(self,
                     matches_processed: int,
                     opportunities_found: int,
                     error: Optional[str] = None):
        """
        Complete the current run with statistics

        Args:
            matches_processed: Number of matches processed
            opportunities_found: Number of opportunities found
            error: Error message if failed
        """
        if not self.current_run_id:
            return

        try:
            execution_time_ms = int((time.time() - self.start_time) * 1000)

            update_data = {
                'status': 'failed' if error else 'completed',
                'completed_at': datetime.utcnow().isoformat(),
                'matches_processed': matches_processed,
                'opportunities_found': opportunities_found,
                'execution_time_ms': execution_time_ms,
                'error_message': error
            }

            self.db.client.table('runs').update(update_data).eq(
                'id', self.current_run_id
            ).execute()

            self.db.log_system_event(
                level='ERROR' if error else 'INFO',
                event='opportunity_engine_completed',
                details={
                    'run_id': self.current_run_id,
                    'matches_processed': matches_processed,
                    'opportunities_found': opportunities_found,
                    'execution_time_ms': execution_time_ms,
                    'error': error
                }
            )

            status = "❌ BAŞARISIZ" if error else "✅ TAMAMLANDI"
            print(f"\n{status}")
            print(f"Run ID: {self.current_run_id}")
            print(f"İşlenen maç: {matches_processed}")
            print(f"Bulunan fırsat: {opportunities_found}")
            print(f"Süre: {execution_time_ms}ms ({execution_time_ms/1000:.2f}s)")

        except Exception as e:
            print(f"⚠️  Run kapatılamadı: {e}")

    def load_matches_from_supabase(self,
                                   date_from: Optional[str] = None,
                                   date_to: Optional[str] = None,
                                   leagues: Optional[List[str]] = None) -> List[Dict]:
        """
        Load matches from Supabase with filters

        Args:
            date_from: Start date (YYYY-MM-DD)
            date_to: End date (YYYY-MM-DD)
            leagues: List of league names to filter

        Returns:
            List of match dictionaries
        """
        try:
            print(f"\n📂 Supabase'den maçlar yükleniyor...")

            # Build query
            query = self.db.client.table('matches').select('*')

            # Date filters
            if date_from:
                query = query.gte('match_date', date_from)
            if date_to:
                query = query.lte('match_date', date_to)

            # League filter
            if leagues:
                query = query.in_('league', leagues)

            # Only matches with odds
            query = query.not_.is_('opening_odds', 'null')

            # Execute
            response = query.execute()
            matches = response.data

            print(f"✅ {len(matches)} maç yüklendi")

            # Filter out past matches (if enabled)
            if self.skip_past_matches:
                now = datetime.utcnow()
                upcoming_matches = []

                for match in matches:
                    # Check if match has started
                    if match.get('match_date') and match.get('match_time'):
                        try:
                            match_dt_str = f"{match['match_date']} {match['match_time']}"
                            match_dt = pd.to_datetime(match_dt_str)

                            # Only include future matches
                            if match_dt > now:
                                upcoming_matches.append(match)
                        except:
                            # If time parsing fails, include the match
                            upcoming_matches.append(match)
                    else:
                        # No time info, include it
                        upcoming_matches.append(match)

                print(f"🔄 {len(upcoming_matches)} henüz oynanmamış maç")
                return upcoming_matches
            else:
                print(f"🔄 {len(matches)} maç (geçmiş maçlar dahil)")
                return matches

        except Exception as e:
            print(f"❌ Maçlar yüklenemedi: {e}")
            raise

    def check_odds_match(self,
                         match_odds: Dict,
                         rule_odds: Dict,
                         is_exclude: bool = False) -> bool:
        """
        Check if match odds match rule requirements

        Args:
            match_odds: Match opening_odds (JSONB from database)
            rule_odds: Rule required odds
            is_exclude: Exclude check (rule should NOT match)

        Returns:
            True if match found
        """
        if not match_odds:
            return False

        for odds_key, required_val in rule_odds.items():
            # Convert rule odds key to database format
            # Example: "2,5 Ü" -> "oran_25_ust"
            db_key = self._convert_odds_key(odds_key)

            actual_val = match_odds.get(db_key)

            if actual_val is None:
                if is_exclude:
                    continue
                return False

            # Tolerance check
            diff = abs(float(actual_val) - float(required_val))
            is_match = diff <= self.tolerance

            if is_exclude:
                if is_match:
                    return False
            else:
                if not is_match:
                    return False

        return True

    def _convert_odds_key(self, rule_key: str) -> str:
        """
        Convert golden rule odds key to database JSONB key

        Example:
            "2,5 Ü" -> "oran_25_ust"
            "4-5" -> "oran_45"
            "VAR" -> "oran_var"
        """
        # This mapping should match import_excel_with_odds.py
        mapping = {
            "4-5": "oran_45",
            "2,5 Ü": "oran_25_ust",
            "3,5 Ü": "oran_35_ust",
            "3,5 A": "oran_35_alt",
            "VAR": "oran_var",
            "1": "oran_1",
            "0": "oran_0",
            "2": "oran_2",
            "İY 0.5": "iy_05",
            "İY 1.5": "iy_15",
            "MS 0.5": "ms_05",
            "MS 1.5": "ms_15",
            "MS 2.5": "ms_25",
            "MS 3.5": "ms_35",
        }

        return mapping.get(rule_key, rule_key.lower().replace(" ", "_"))

    def match_rule_to_match(self, match: Dict, rule: GoldenRule) -> bool:
        """
        Check if a match satisfies a golden rule

        Args:
            match: Match dict from Supabase
            rule: GoldenRule object

        Returns:
            True if rule matches
        """
        odds = match.get('opening_odds', {})

        # Primary odds check
        if not self.check_odds_match(odds, rule.primary_odds, is_exclude=False):
            return False

        # Secondary odds check
        if rule.secondary_odds:
            if not self.check_odds_match(odds, rule.secondary_odds, is_exclude=False):
                return False

        # Exclude odds check
        if rule.exclude_odds:
            if not self.check_odds_match(odds, rule.exclude_odds, is_exclude=True):
                return False

        return True

    def calculate_confidence(self, rule: GoldenRule, prediction: str) -> int:
        """
        Calculate confidence score for a prediction

        Args:
            rule: Matched golden rule
            prediction: Single prediction

        Returns:
            Confidence score (0-100)
        """
        base = rule.confidence_base

        # Importance bonus
        importance_bonus = {
            "çok_önemli": 3,
            "önemli": 2,
            "özel": 1,
            "normal": 0
        }
        base += importance_bonus.get(rule.importance, 0)

        # Few predictions = higher confidence
        prediction_count = len(rule.predictions)
        if prediction_count <= 2:
            base += 2
        elif prediction_count <= 4:
            base += 1

        # Primary prediction bonus
        if rule.predictions and prediction == rule.predictions[0]:
            base += 1

        return min(100, base)

    def process_matches(self, matches: List[Dict]) -> List[Dict]:
        """
        Process matches and find opportunities

        Args:
            matches: List of match dicts from Supabase

        Returns:
            List of opportunity dicts
        """
        print(f"\n🔍 {len(matches)} maç işleniyor...")

        opportunities = []

        for idx, match in enumerate(matches, 1):
            matched_rules = []

            # Check all golden rules
            for rule in self.golden_rules:
                if self.match_rule_to_match(match, rule):
                    matched_rules.append((rule, rule.predictions))

            # If any rules matched, create opportunity
            if matched_rules:
                # Collect all predictions with confidence
                all_predictions = []
                for rule, predictions in matched_rules:
                    for pred in predictions:
                        confidence = self.calculate_confidence(rule, pred)
                        all_predictions.append({
                            "bet": pred,
                            "confidence": confidence,
                            "rule_id": rule.id,
                            "rule_name": rule.name
                        })

                # Sort by confidence
                all_predictions.sort(key=lambda x: x["confidence"], reverse=True)

                # Best prediction
                best = all_predictions[0]

                # Filter by min_confidence
                if best["confidence"] >= self.min_confidence:
                    opportunity = {
                        "match_id": match["id"],
                        "home_team": match["home_team"],
                        "away_team": match["away_team"],
                        "league": match["league"],
                        "match_date": match["match_date"],
                        "match_time": match.get("match_time"),
                        "prediction": best["bet"],
                        "confidence": best["confidence"],
                        "alternative_predictions": all_predictions[1:],  # ALL alternatives (no limit)
                        "matched_rules": [
                            {"rule_id": r.id, "rule_name": r.name}
                            for r, _ in matched_rules
                        ],
                        "note": f"{len(all_predictions)} tahmin mevcut"
                    }
                    opportunities.append(opportunity)

            # Progress
            if idx % 100 == 0:
                print(f"  İşlenen: {idx}/{len(matches)} maç")

        print(f"✅ {len(opportunities)} fırsat bulundu (min {self.min_confidence}% güven)")

        return opportunities

    def archive_old_predictions(self, date_from: str, date_to: str) -> int:
        """
        Delete old active predictions for the date range being updated
        This keeps historical data for past dates while refreshing current forecasts

        Args:
            date_from: Start date of current run
            date_to: End date of current run

        Returns:
            Number of predictions deleted
        """
        try:
            print("\n📦 Eski tahminler temizleniyor (aynı tarih aralığı)...")

            # Delete active predictions for the same date range
            # This ensures fresh predictions for upcoming matches
            # Past dates remain in database for historical analysis
            delete_response = self.db.client.table('predictions')\
                .delete()\
                .eq('status', 'active')\
                .gte('match_date', date_from)\
                .lte('match_date', date_to)\
                .execute()

            deleted_count = len(delete_response.data) if delete_response.data else 0

            if deleted_count > 0:
                print(f"✅ {deleted_count} eski tahmin temizlendi ({date_from} - {date_to})")
                self.db.log_system_event(
                    level='INFO',
                    event='old_predictions_cleaned',
                    details={'count': deleted_count, 'date_from': date_from, 'date_to': date_to, 'run_id': self.current_run_id}
                )
            else:
                print("ℹ️  Temizlenecek eski tahmin yok")

            return deleted_count

        except Exception as e:
            print(f"⚠️  Temizleme hatası (devam ediliyor): {e}")
            return 0

    def save_predictions(self, opportunities: List[Dict]) -> int:
        """
        Save opportunities to predictions table

        Args:
            opportunities: List of opportunity dicts

        Returns:
            Number of predictions saved
        """
        if not opportunities:
            print("⚠️  Kaydedilecek fırsat yok")
            return 0

        print(f"\n💾 {len(opportunities)} fırsat kaydediliyor...")

        try:
            # Add run_id to each prediction
            predictions = []
            for opp in opportunities:
                pred = opp.copy()
                pred['run_id'] = self.current_run_id
                pred['status'] = 'active'
                pred['result'] = 'pending'  # Track result status
                predictions.append(pred)

            # Batch insert
            batch_size = 100
            inserted_count = 0

            for i in range(0, len(predictions), batch_size):
                batch = predictions[i:i + batch_size]

                response = self.db.client.table('predictions').insert(batch).execute()
                inserted_count += len(response.data)

            print(f"✅ {inserted_count} tahmin kaydedildi")
            return inserted_count

        except Exception as e:
            print(f"❌ Tahminler kaydedilemedi: {e}")
            raise

    def run(self,
            date_from: Optional[str] = None,
            date_to: Optional[str] = None,
            leagues: Optional[List[str]] = None) -> Dict:
        """
        Main execution pipeline

        Args:
            date_from: Start date (default: today)
            date_to: End date (default: today + days_ahead)
            leagues: League filter (default: all)

        Returns:
            Summary dict
        """
        print("=" * 70)
        print("🚀 OPPORTUNITY ENGINE V2 - SUPABASE")
        print("=" * 70)

        # Default date range
        if not date_from:
            date_from = datetime.utcnow().strftime('%Y-%m-%d')
        if not date_to:
            date_to = (datetime.utcnow() + timedelta(days=self.days_ahead)).strftime('%Y-%m-%d')

        filters = {
            'date_from': date_from,
            'date_to': date_to,
            'leagues': leagues,
            'min_confidence': self.min_confidence
        }

        print(f"\n📅 Tarih aralığı: {date_from} → {date_to}")
        print(f"🎯 Min güven: {self.min_confidence}%")
        if leagues:
            print(f"⚽ Ligler: {', '.join(leagues)}")

        try:
            # Create run
            self.create_run(filters)

            # Clean old predictions for same date range before creating new ones
            self.archive_old_predictions(date_from, date_to)

            # Load matches
            matches = self.load_matches_from_supabase(
                date_from=date_from,
                date_to=date_to,
                leagues=leagues
            )

            if not matches:
                print("\n⚠️  İşlenecek maç bulunamadı!")
                self.complete_run(0, 0)
                return {
                    'success': True,
                    'matches_processed': 0,
                    'opportunities_found': 0
                }

            # Process matches
            opportunities = self.process_matches(matches)

            # Save predictions
            saved_count = self.save_predictions(opportunities)

            # Complete run
            self.complete_run(len(matches), saved_count)

            return {
                'success': True,
                'run_id': self.current_run_id,
                'matches_processed': len(matches),
                'opportunities_found': saved_count
            }

        except Exception as e:
            error_msg = str(e)
            print(f"\n❌ HATA: {error_msg}")

            self.complete_run(0, 0, error=error_msg)

            return {
                'success': False,
                'error': error_msg
            }


def main():
    """CLI entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Opportunity Engine V2")
    parser.add_argument("--date-from", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--date-to", help="End date (YYYY-MM-DD)")
    parser.add_argument("--leagues", nargs="+", help="League filter")
    parser.add_argument("--min-confidence", type=int, default=85, help="Min confidence")
    parser.add_argument("--days-ahead", type=int, default=3, help="Days ahead to fetch")
    parser.add_argument("--include-past", action="store_true", help="Include past matches (for testing)")

    args = parser.parse_args()

    # Create engine
    engine = SupabaseOpportunityEngine(
        min_confidence=args.min_confidence,
        days_ahead=args.days_ahead,
        skip_past_matches=not args.include_past
    )

    # Run
    result = engine.run(
        date_from=args.date_from,
        date_to=args.date_to,
        leagues=args.leagues
    )

    # Exit code
    exit(0 if result['success'] else 1)


if __name__ == "__main__":
    main()
