"""
WESTBET PRO - ANA PİPELİNE
Backend entegrasyon noktası

Akış:
1. (Opsiyonel) Stage 0: Excel okuma
2. (Opsiyonel) Stage 1: Kural uygulama
3. Stage 2: Fırsat maç çıkarma (opportunity_engine)
4. (Opsiyonel) Stage 3: Backtest/scoring (opportunity_scorer)
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import argparse

# Local imports
from opportunity_engine import OpportunityEngine
from opportunity_scorer import OpportunityScorer


def print_banner():
    """ASCII banner"""
    print("="*70)
    print("""
    ██╗    ██╗███████╗███████╗████████╗██████╗ ███████╗████████╗
    ██║    ██║██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔════╝╚══██╔══╝
    ██║ █╗ ██║█████╗  ███████╗   ██║   ██████╔╝█████╗     ██║
    ██║███╗██║██╔══╝  ╚════██║   ██║   ██╔══██╗██╔══╝     ██║
    ╚███╔███╔╝███████╗███████║   ██║   ██████╔╝███████╗   ██║
     ╚══╝╚══╝ ╚══════╝╚══════╝   ╚═╝   ╚═════╝ ╚══════╝   ╚═╝

        BETTING ANALYSIS ENGINE - COMMAND CENTER
    """)
    print("="*70)
    print(f"⏰ Başlangıç: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)


def check_data_files():
    """Gerekli dosyaların varlığını kontrol et"""
    print("\n📁 VERİ DOSYALARI KONTROLÜ")
    print("-"*70)

    files_status = []

    # Bulletin candidates (zorunlu)
    bulletin_path = "data/bulletin_candidates.pkl"
    bulletin_exists = os.path.exists(bulletin_path)
    files_status.append(("bulletin_candidates.pkl", bulletin_exists, "Zorunlu"))

    # History candidates (opsiyonel)
    history_path = "data/history_candidates.pkl"
    history_exists = os.path.exists(history_path)
    files_status.append(("history_candidates.pkl", history_exists, "Opsiyonel"))

    # Opportunities JSON (üretilecek)
    opportunities_path = "data/opportunities.json"
    opportunities_exists = os.path.exists(opportunities_path)
    files_status.append(("opportunities.json", opportunities_exists, "Üretilecek"))

    # Print status
    for filename, exists, status_type in files_status:
        icon = "✅" if exists else ("❌" if status_type == "Zorunlu" else "⚠️ ")
        print(f"  {icon} {filename:<30} [{status_type}]")

    print("-"*70)

    # Bulletin yoksa hata
    if not bulletin_exists:
        print("\n❌ HATA: bulletin_candidates.pkl bulunamadı!")
        print("   Pipeline çalıştırılamaz. Önce stage0/stage1'i çalıştırın.")
        return False

    return True


def run_opportunity_engine(
    bulletin_path: str = "data/bulletin_candidates.pkl",
    output_path: str = "data/opportunities.json",
    tolerance: float = 0.01
) -> int:
    """
    Fırsat maç çıkarma motoru

    Returns:
        Bulunan fırsat sayısı
    """
    print("\n" + "="*70)
    print("🔥 STAGE 2: FIRSAT MAÇ ÇIKARMA MOT ORU")
    print("="*70)

    engine = OpportunityEngine(
        bulletin_pkl_path=bulletin_path,
        output_json_path=output_path,
        tolerance=tolerance
    )

    # Extract opportunities
    opportunities = engine.extract_opportunities()

    # Save
    if opportunities:
        engine.save_opportunities(opportunities)

        # Stats
        print("\n📊 İSTATİSTİKLER:")
        print(f"  ✅ Toplam Fırsat: {len(opportunities)}")

        avg_conf = sum(o["best_confidence"] for o in opportunities) / len(opportunities)
        print(f"  📈 Ortalama Güven: {avg_conf:.1f}%")

        # Best 3
        print(f"\n⭐ EN İYİ 3 FIRSAT:")
        sorted_opps = sorted(opportunities, key=lambda x: x["best_confidence"], reverse=True)
        for i, opp in enumerate(sorted_opps[:3], 1):
            print(f"  {i}. {opp['Ev Sahibi']} vs {opp['Deplasman']}")
            print(f"     {opp['best_prediction']} ({opp['best_confidence']}%)")

        return len(opportunities)
    else:
        print("\n⚠️  Hiç fırsat bulunamadı!")
        return 0


def run_opportunity_scorer(
    history_path: str = "data/history_candidates.pkl",
    output_path: str = "data/scorer_report.json"
) -> bool:
    """
    Confidence skorlama sistemi (backtest)

    Returns:
        Başarılı mı?
    """
    if not os.path.exists(history_path):
        print("\n⚠️  Geçmiş veri yok, scoring atlanıyor.")
        return False

    print("\n" + "="*70)
    print("📊 STAGE 3: CONFIDENCE SKORLAMA (BACKTEST)")
    print("="*70)

    scorer = OpportunityScorer(
        history_pkl_path=history_path,
        output_report_path=output_path
    )

    scorer.run()
    return True


def main():
    """Ana pipeline"""
    # CLI args
    parser = argparse.ArgumentParser(
        description="WestBet Pro - Betting Analysis Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Örnekler:
  python3 main.py                           # Tam pipeline (default)
  python3 main.py --skip-scoring            # Scoring'siz çalıştır
  python3 main.py --tolerance 0.02          # Oran toleransı artır
  python3 main.py --bulletin custom.pkl     # Farklı dosya kullan
        """
    )

    parser.add_argument(
        "--bulletin",
        default="data/bulletin_candidates.pkl",
        help="Bülten adayları pickle dosyası"
    )

    parser.add_argument(
        "--output",
        default="data/opportunities.json",
        help="Fırsat maçlar çıktı JSON"
    )

    parser.add_argument(
        "--tolerance",
        type=float,
        default=0.01,
        help="Oran eşleştirme toleransı (default: 0.01 = %%1)"
    )

    parser.add_argument(
        "--skip-scoring",
        action="store_true",
        help="Backtest/scoring adımını atla"
    )

    parser.add_argument(
        "--history",
        default="data/history_candidates.pkl",
        help="Geçmiş veriler pickle dosyası"
    )

    args = parser.parse_args()

    # Banner
    print_banner()

    # Data check
    if not check_data_files():
        sys.exit(1)

    # ─────────────────────────────────────────────────────────────
    # STAGE 2: OPPORTUNITY ENGINE
    # ─────────────────────────────────────────────────────────────
    try:
        opportunity_count = run_opportunity_engine(
            bulletin_path=args.bulletin,
            output_path=args.output,
            tolerance=args.tolerance
        )

        print(f"\n✅ Stage 2 tamamlandı: {opportunity_count} fırsat bulundu")
        print(f"💾 Çıktı: {args.output}")

    except Exception as e:
        print(f"\n❌ HATA (Stage 2): {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # ─────────────────────────────────────────────────────────────
    # STAGE 3: SCORING (Opsiyonel)
    # ─────────────────────────────────────────────────────────────
    if not args.skip_scoring:
        try:
            success = run_opportunity_scorer(
                history_path=args.history,
                output_path="data/scorer_report.json"
            )

            if success:
                print(f"\n✅ Stage 3 tamamlandı")
                print(f"💾 Rapor: data/scorer_report.json")

        except Exception as e:
            print(f"\n⚠️  Scoring hatası (devam ediliyor): {e}")

    # ─────────────────────────────────────────────────────────────
    # ÖZET
    # ─────────────────────────────────────────────────────────────
    print("\n" + "="*70)
    print("🎉 PİPELİNE TAMAMLANDI")
    print("="*70)
    print(f"⏰ Bitiş: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"\n📊 ÖZET:")
    print(f"  • Fırsat Maç Sayısı: {opportunity_count}")
    print(f"  • Çıktı Dosyası: {args.output}")

    if os.path.exists(args.output):
        file_size = os.path.getsize(args.output) / 1024
        print(f"  • Dosya Boyutu: {file_size:.2f} KB")

    print("\n💡 Dashboard'u başlatmak için:")
    print("   python3 dashboard_final.py")

    print("\n" + "="*70)


if __name__ == "__main__":
    main()
