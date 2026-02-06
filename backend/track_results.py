"""
Result Tracker - Track match results and update prediction outcomes
Automatically checks finished matches and updates prediction results
"""

import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from db import get_client
import api_football


class ResultTracker:
    """
    Tracks match results and updates prediction outcomes
    """

    def __init__(self):
        self.db = get_client()

    def normalize_team_name(self, name: str) -> str:
        """Normalize team name for matching"""
        if not name:
            return ""

        # Turkish character normalization
        replacements = {
            'İ': 'I', 'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C',
            'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c'
        }

        for tr_char, en_char in replacements.items():
            name = name.replace(tr_char, en_char)

        return name.upper().strip()

    def check_prediction_result(self,
                                prediction: str,
                                match_data: Dict) -> str:
        """
        Check if prediction was correct

        Args:
            prediction: Prediction string (e.g., "İY 0.5 ÜST")
            match_data: Match data with scores

        Returns:
            Result status: 'won', 'lost', 'half_won', 'pending'
        """
        if not match_data:
            return 'pending'

        pred = prediction.upper().strip()

        # Get scores
        ft_home = match_data.get('fulltime_home')
        ft_away = match_data.get('fulltime_away')
        ht_home = match_data.get('halftime_home')
        ht_away = match_data.get('halftime_away')

        # If match not finished
        if ft_home is None or ft_away is None:
            return 'pending'

        try:
            ft_home = int(ft_home)
            ft_away = int(ft_away)
            ht_home = int(ht_home) if ht_home is not None else 0
            ht_away = int(ht_away) if ht_away is not None else 0
        except (ValueError, TypeError):
            return 'pending'

        total_goals = ft_home + ft_away
        ht_total = ht_home + ht_away

        # İlk Yarı Tahminleri
        if 'IY' in pred or 'ILKY' in pred:
            if '0.5 UST' in pred or '0.5 ÜST' in pred:
                return 'won' if ht_total >= 1 else 'lost'
            elif '1.5 UST' in pred or '1.5 ÜST' in pred:
                return 'won' if ht_total >= 2 else 'lost'
            elif '2.5 UST' in pred or '2.5 ÜST' in pred:
                return 'won' if ht_total >= 3 else 'lost'
            elif 'EV' in pred and ('0.5 UST' in pred or '0.5 ÜST' in pred):
                return 'won' if ht_home >= 1 else 'lost'
            elif 'DEP' in pred and ('0.5 UST' in pred or '0.5 ÜST' in pred):
                return 'won' if ht_away >= 1 else 'lost'

        # Maç Geneli Tahminleri
        if 'MS' in pred or 'MAC' in pred:
            if '0.5 UST' in pred or '0.5 ÜST' in pred:
                return 'won' if total_goals >= 1 else 'lost'
            elif '1.5 UST' in pred or '1.5 ÜST' in pred:
                return 'won' if total_goals >= 2 else 'lost'
            elif '2.5 UST' in pred or '2.5 ÜST' in pred:
                return 'won' if total_goals >= 3 else 'lost'
            elif '3.5 UST' in pred or '3.5 ÜST' in pred:
                return 'won' if total_goals >= 4 else 'lost'
            elif '4.5 UST' in pred or '4.5 ÜST' in pred:
                return 'won' if total_goals >= 5 else 'lost'
            elif '5.5 UST' in pred or '5.5 ÜST' in pred:
                return 'won' if total_goals >= 6 else 'lost'
            elif '2.5 ALT' in pred:
                return 'won' if total_goals < 3 else 'lost'
            elif '3.5 ALT' in pred:
                return 'won' if total_goals < 4 else 'lost'

        # Karşılıklı Gol
        if 'KG' in pred or 'KARSILIKLI' in pred:
            both_scored = ft_home > 0 and ft_away > 0
            if 'VAR' in pred:
                return 'won' if both_scored else 'lost'
            elif 'YOK' in pred:
                return 'won' if not both_scored else 'lost'

        # Default: couldn't determine
        return 'pending'

    def get_pending_predictions(self, limit: int = 100) -> List[Dict]:
        """
        Get predictions that need result checking

        Args:
            limit: Max predictions to fetch

        Returns:
            List of prediction records
        """
        try:
            # Get predictions with pending results and match date in the past
            now = datetime.utcnow()

            response = self.db.client.table('predictions')\
                .select('*')\
                .eq('result', 'pending')\
                .lt('match_date', now.strftime('%Y-%m-%d %H:%M:%S'))\
                .limit(limit)\
                .execute()

            return response.data if response.data else []

        except Exception as e:
            print(f"❌ Pending predictions fetch error: {e}")
            return []

    def update_prediction_result(self,
                                 prediction_id: str,
                                 result: str,
                                 match_data: Dict) -> bool:
        """
        Update prediction result in database

        Args:
            prediction_id: Prediction ID
            result: Result status ('won', 'lost', etc.)
            match_data: Match data for reference

        Returns:
            Success status
        """
        try:
            update_data = {
                'result': result,
                'updated_at': datetime.utcnow().isoformat()
            }

            # Add match result note
            if match_data:
                ft_home = match_data.get('fulltime_home', '?')
                ft_away = match_data.get('fulltime_away', '?')
                ht_home = match_data.get('halftime_home', '?')
                ht_away = match_data.get('halftime_away', '?')

                update_data['note'] = f"MS: {ft_home}-{ft_away} | İY: {ht_home}-{ht_away}"

            self.db.client.table('predictions')\
                .update(update_data)\
                .eq('id', prediction_id)\
                .execute()

            return True

        except Exception as e:
            print(f"❌ Update error for {prediction_id}: {e}")
            return False

    def track_results(self, days_back: int = 3) -> Dict:
        """
        Main tracking function - checks match results and updates predictions

        Args:
            days_back: How many days back to check

        Returns:
            Summary dict
        """
        print("=" * 70)
        print("🎯 RESULT TRACKER - Tahmin Sonuçlarını Güncelleme")
        print("=" * 70)

        start_time = time.time()

        # Get pending predictions
        pending = self.get_pending_predictions(limit=200)

        if not pending:
            print("\n✅ Güncellenecek tahmin yok")
            return {
                'success': True,
                'checked': 0,
                'updated': 0,
                'won': 0,
                'lost': 0
            }

        print(f"\n📋 {len(pending)} tahmin kontrol ediliyor...")

        updated_count = 0
        won_count = 0
        lost_count = 0
        errors = []

        for pred in pending:
            try:
                home_team = pred.get('home_team', '')
                away_team = pred.get('away_team', '')
                match_date = pred.get('match_date', '')
                prediction = pred.get('prediction', '')

                # Get match result from API
                match_data = api_football.get_match_by_teams_and_date(
                    home_team=home_team,
                    away_team=away_team,
                    match_date=match_date
                )

                if not match_data:
                    continue

                # Check prediction result
                result = self.check_prediction_result(prediction, match_data)

                if result != 'pending':
                    # Update database
                    success = self.update_prediction_result(
                        prediction_id=pred['id'],
                        result=result,
                        match_data=match_data
                    )

                    if success:
                        updated_count += 1
                        if result == 'won':
                            won_count += 1
                        elif result == 'lost':
                            lost_count += 1

                        print(f"  ✓ {home_team} vs {away_team}: {result.upper()}")

                time.sleep(0.3)  # Rate limiting

            except Exception as e:
                errors.append(f"{home_team} vs {away_team}: {str(e)}")
                continue

        elapsed = time.time() - start_time

        print(f"\n{'='*70}")
        print(f"✅ Tamamlandı!")
        print(f"📊 Kontrol Edilen: {len(pending)}")
        print(f"📝 Güncellenen: {updated_count}")
        print(f"🎉 Kazanan: {won_count}")
        print(f"❌ Kaybeden: {lost_count}")
        print(f"⏱️  Süre: {elapsed:.1f}s")

        if errors:
            print(f"\n⚠️  {len(errors)} hata:")
            for err in errors[:5]:
                print(f"  - {err}")

        self.db.log_system_event(
            level='INFO',
            event='results_tracked',
            details={
                'checked': len(pending),
                'updated': updated_count,
                'won': won_count,
                'lost': lost_count,
                'duration': elapsed
            }
        )

        return {
            'success': True,
            'checked': len(pending),
            'updated': updated_count,
            'won': won_count,
            'lost': lost_count,
            'duration': elapsed
        }


def main():
    """CLI entry point"""
    tracker = ResultTracker()
    result = tracker.track_results(days_back=3)

    if result['success']:
        print("\n🎯 Result tracking tamamlandı!")
    else:
        print("\n❌ Result tracking başarısız!")


if __name__ == '__main__':
    main()
