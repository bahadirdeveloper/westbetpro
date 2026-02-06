"""
CONFIDENCE SKORLAMA SİSTEMİ
Geçmiş verileri kullanarak kuralların başarı oranını hesaplar
"""

import os
import json
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
from datetime import datetime

from golden_rules import GOLDEN_RULES, GoldenRule, get_rule_by_id


class OpportunityScorer:
    """
    Geçmiş verilere dayalı confidence skorlama sistemi

    Akış:
    1. history_candidates.pkl verilerini oku
    2. Her kural için başarı oranını hesapla
    3. Confidence skorlarını dinamik ayarla
    4. Backtest raporunu üret
    """

    def __init__(self,
                 history_pkl_path: str = "data/history_candidates.pkl",
                 output_report_path: str = "data/scorer_report.json"):
        """
        Args:
            history_pkl_path: Geçmiş veriler pickle dosyası
            output_report_path: Çıktı rapor dosyası
        """
        self.history_pkl_path = history_pkl_path
        self.output_report_path = output_report_path
        self.golden_rules = GOLDEN_RULES

    def load_history_data(self) -> pd.DataFrame:
        """Geçmiş verileri yükle"""
        if not os.path.exists(self.history_pkl_path):
            print(f"⚠️  UYARI: {self.history_pkl_path} bulunamadı!")
            return pd.DataFrame()

        df = pd.read_pickle(self.history_pkl_path)
        print(f"✅ Geçmiş veri yüklendi: {len(df):,} satır")
        return df

    def parse_prediction_result(self, prediction: str, row: pd.Series) -> Optional[bool]:
        """
        Tahminin doğru çıkıp çıkmadığını kontrol et

        Args:
            prediction: Tahmin string'i (örn: "MS 1.5 ÜST")
            row: Maç satırı (SKOR MS, SKOR İY içermeli)

        Returns:
            True = doğru, False = yanlış, None = kontrol edilemedi
        """
        skor_ms = row.get("SKOR MS")
        skor_iy = row.get("SKOR İY")

        # Skor yoksa kontrol edilemez
        if pd.isna(skor_ms):
            return None

        try:
            # Skoru parse et (örn: "2-1" -> (2, 1))
            if isinstance(skor_ms, str) and "-" in skor_ms:
                ev, dep = map(int, skor_ms.split("-"))
            else:
                return None

            total_goals_ms = ev + dep

            # İY skoru varsa parse et
            if pd.notna(skor_iy) and isinstance(skor_iy, str) and "-" in skor_iy:
                iy_ev, iy_dep = map(int, skor_iy.split("-"))
                total_goals_iy = iy_ev + iy_dep
            else:
                total_goals_iy = None

        except (ValueError, AttributeError):
            return None

        # Tahmin tipine göre doğruluk kontrolü
        pred_upper = prediction.upper()

        # ── MS (Maç Sonucu) Kontrolleri ──
        if "MS" in pred_upper and "İY" not in pred_upper:
            if "0.5 ÜST" in pred_upper:
                return total_goals_ms >= 1
            elif "1.5 ÜST" in pred_upper:
                return total_goals_ms >= 2
            elif "2.5 ÜST" in pred_upper:
                return total_goals_ms >= 3
            elif "3.5 ÜST" in pred_upper:
                return total_goals_ms >= 4
            elif "2.5 ALT" in pred_upper:
                return total_goals_ms < 3
            elif "3.5 ALT" in pred_upper:
                return total_goals_ms < 4

        # ── İY (İlk Yarı) Kontrolleri ──
        elif "İY" in pred_upper and total_goals_iy is not None:
            if "0.5 ÜST" in pred_upper:
                return total_goals_iy >= 1
            elif "1.5 ÜST" in pred_upper:
                return total_goals_iy >= 2
            elif "0.5 ALT" in pred_upper:
                return total_goals_iy < 1
            elif "1.5 ALT" in pred_upper:
                return total_goals_iy < 2

        # ── KG VAR (Karşılıklı Gol) ──
        elif "KG VAR" in pred_upper or "T.GOL" in pred_upper:
            if total_goals_iy is not None:
                # İY için
                if "İY" in pred_upper:
                    return iy_ev > 0 and iy_dep > 0
            # MS için
            return ev > 0 and dep > 0

        # ── EV/DEP Gol Kontrolleri ──
        elif "EV" in pred_upper and "MS" in pred_upper:
            if "0.5 ÜST" in pred_upper:
                return ev >= 1
            elif "1.5 ÜST" in pred_upper:
                return ev >= 2

        elif "DEP" in pred_upper and "MS" in pred_upper:
            if "0.5 ÜST" in pred_upper:
                return dep >= 1
            elif "1.5 ÜST" in pred_upper:
                return dep >= 2

        # Tanınmayan tahmin tipi
        return None

    def calculate_rule_accuracy(self, rule_id: int, history_df: pd.DataFrame) -> Dict:
        """
        Bir kuralın başarı oranını hesapla

        Args:
            rule_id: Kural ID
            history_df: Geçmiş veriler

        Returns:
            {
                "rule_id": int,
                "total_matches": int,
                "predictions_tested": int,
                "successful": int,
                "failed": int,
                "accuracy": float,
                "confidence_adjustment": int
            }
        """
        rule = get_rule_by_id(rule_id)
        if not rule:
            return {}

        # Bu kurala ait geçmiş maçlar
        rule_matches = history_df[history_df["senaryo_id"] == rule_id]

        if len(rule_matches) == 0:
            return {
                "rule_id": rule_id,
                "rule_name": rule.name,
                "total_matches": 0,
                "predictions_tested": 0,
                "successful": 0,
                "failed": 0,
                "accuracy": 0.0,
                "confidence_adjustment": 0
            }

        # Her tahmin için sonuçları topla
        prediction_results = defaultdict(lambda: {"success": 0, "fail": 0})

        for _, row in rule_matches.iterrows():
            for prediction in rule.predictions:
                result = self.parse_prediction_result(prediction, row)
                if result is not None:
                    if result:
                        prediction_results[prediction]["success"] += 1
                    else:
                        prediction_results[prediction]["fail"] += 1

        # Toplam başarı/başarısızlık
        total_success = sum(p["success"] for p in prediction_results.values())
        total_fail = sum(p["fail"] for p in prediction_results.values())
        total_tested = total_success + total_fail

        # Accuracy hesapla
        accuracy = (total_success / total_tested * 100) if total_tested > 0 else 0.0

        # Confidence adjustment hesapla
        # 90%+ accuracy: +5
        # 85-90%: +2
        # 80-85%: 0
        # 75-80%: -2
        # <75%: -5
        if accuracy >= 90:
            adjustment = 5
        elif accuracy >= 85:
            adjustment = 2
        elif accuracy >= 80:
            adjustment = 0
        elif accuracy >= 75:
            adjustment = -2
        else:
            adjustment = -5

        return {
            "rule_id": rule_id,
            "rule_name": rule.name,
            "total_matches": len(rule_matches),
            "predictions_tested": total_tested,
            "successful": total_success,
            "failed": total_fail,
            "accuracy": round(accuracy, 2),
            "confidence_adjustment": adjustment,
            "prediction_breakdown": dict(prediction_results)
        }

    def generate_backtest_report(self, history_df: pd.DataFrame) -> Dict:
        """
        Tüm kurallar için backtest raporu üret

        Args:
            history_df: Geçmiş veriler

        Returns:
            Backtest raporu
        """
        print("📊 Backtest raporu oluşturuluyor...")

        rule_stats = []
        for rule in self.golden_rules:
            stats = self.calculate_rule_accuracy(rule.id, history_df)
            if stats:
                rule_stats.append(stats)

        # Genel istatistikler
        total_tested = sum(s["predictions_tested"] for s in rule_stats)
        total_success = sum(s["successful"] for s in rule_stats)
        total_fail = sum(s["failed"] for s in rule_stats)
        overall_accuracy = (total_success / (total_success + total_fail) * 100) if (total_success + total_fail) > 0 else 0

        # En iyi 10 kural
        top_rules = sorted(rule_stats, key=lambda x: x["accuracy"], reverse=True)[:10]

        # En kötü 10 kural
        worst_rules = sorted(rule_stats, key=lambda x: x["accuracy"])[:10]

        report = {
            "generated_at": datetime.now().isoformat(),
            "total_history_matches": len(history_df),
            "total_rules_tested": len(rule_stats),
            "overall_stats": {
                "total_predictions_tested": total_tested,
                "total_successful": total_success,
                "total_failed": total_fail,
                "overall_accuracy": round(overall_accuracy, 2)
            },
            "top_10_rules": top_rules,
            "worst_10_rules": worst_rules,
            "all_rule_stats": rule_stats
        }

        return report

    def save_report(self, report: Dict) -> None:
        """
        Raporu JSON formatında kaydet

        Args:
            report: Backtest raporu
        """
        with open(self.output_report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        print(f"💾 Backtest raporu kaydedildi: {self.output_report_path}")

    def get_adjusted_confidence(self, rule_id: int, prediction: str, base_confidence: int) -> int:
        """
        Backtest sonuçlarına göre adjust edilmiş confidence döndür

        Args:
            rule_id: Kural ID
            prediction: Tahmin
            base_confidence: Temel confidence

        Returns:
            Adjust edilmiş confidence
        """
        # Rapor dosyası varsa oku
        if not os.path.exists(self.output_report_path):
            return base_confidence

        with open(self.output_report_path, "r", encoding="utf-8") as f:
            report = json.load(f)

        # Rule stats bul
        rule_stats = next((r for r in report["all_rule_stats"] if r["rule_id"] == rule_id), None)

        if not rule_stats:
            return base_confidence

        # Adjustment uygula
        adjusted = base_confidence + rule_stats["confidence_adjustment"]

        # 0-100 arası tut
        return max(0, min(100, adjusted))

    def run(self) -> None:
        """
        Full pipeline çalıştır: Load → Analyze → Report
        """
        print("="*60)
        print("📊 CONFIDENCE SKORLAMA SİSTEMİ")
        print("="*60)

        # Load history
        history_df = self.load_history_data()

        if history_df.empty:
            print("❌ Geçmiş veri bulunamadı!")
            return

        # Generate report
        report = self.generate_backtest_report(history_df)

        # Save
        self.save_report(report)

        # Print summary
        print("\n📈 ÖZET:")
        print(f"  Toplam Test: {report['overall_stats']['total_predictions_tested']}")
        print(f"  Başarılı: {report['overall_stats']['total_successful']}")
        print(f"  Başarısız: {report['overall_stats']['total_failed']}")
        print(f"  Genel Doğruluk: {report['overall_stats']['overall_accuracy']:.2f}%")

        print("\n⭐ EN İYİ 5 KURAL:")
        for i, rule in enumerate(report["top_10_rules"][:5], 1):
            print(f"  {i}. {rule['rule_name']}")
            print(f"     Doğruluk: {rule['accuracy']}% ({rule['successful']}/{rule['predictions_tested']})")

        print("\n⚠️  EN KÖTÜ 5 KURAL:")
        for i, rule in enumerate(report["worst_10_rules"][:5], 1):
            print(f"  {i}. {rule['rule_name']}")
            print(f"     Doğruluk: {rule['accuracy']}% ({rule['successful']}/{rule['predictions_tested']})")

        print("="*60)
        print("✅ İşlem tamamlandı!")
        print("="*60)


# ═══════════════════════════════════════════════════════════════════
# CLI KULLANIMI
# ═══════════════════════════════════════════════════════════════════

def main():
    """CLI entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Confidence skorlama sistemi")
    parser.add_argument("--history", default="data/history_candidates.pkl", help="Geçmiş veriler pickle")
    parser.add_argument("--output", default="data/scorer_report.json", help="Çıktı rapor dosyası")

    args = parser.parse_args()

    # Scorer oluştur ve çalıştır
    scorer = OpportunityScorer(
        history_pkl_path=args.history,
        output_report_path=args.output
    )

    scorer.run()


if __name__ == "__main__":
    main()
