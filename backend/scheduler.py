"""
WestBetPro Scheduler
Automatically runs live score updates at regular intervals
No manual intervention needed - just start and forget

Usage:
    python scheduler.py                    # Run with defaults (2 min interval)
    python scheduler.py --interval 60      # Custom interval (seconds)
    python scheduler.py --once             # Run once and exit
"""

import time
import signal
import sys
import logging
import argparse
from datetime import datetime

from live_score_updater import update_live_scores, get_api_usage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('scheduler')

# Track if we should stop
running = True


def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully"""
    global running
    print("\n🛑 Scheduler durduruluyor...")
    running = False


def run_scheduler(interval_seconds: int = 120, run_once: bool = False):
    """
    Main scheduler loop

    Args:
        interval_seconds: Seconds between each update cycle (default: 120 = 2 min)
        run_once: If True, run once and exit
    """
    global running
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("=" * 60)
    print("⚽ WestBetPro Live Score Scheduler")
    print("=" * 60)
    print(f"📊 Güncelleme aralığı: {interval_seconds} saniye")
    print(f"🕐 Başlangıç: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Show initial API usage
    usage = get_api_usage()
    if usage['success']:
        print(f"📡 API Plan: {usage['plan']}")
        print(f"📡 Günlük Limit: {usage['daily_limit']}")
        print(f"📡 Kullanılan: {usage['used_today']}")
        print(f"📡 Kalan: {usage['remaining']}")

        # Calculate how many cycles we can afford
        # Each cycle uses ~2 API calls
        if usage['remaining'] > 0:
            max_cycles = usage['remaining'] // 2
            print(f"📡 Tahmini maks. güncelleme: ~{max_cycles} döngü")
    print("=" * 60)

    cycle = 0

    while running:
        cycle += 1
        print(f"\n🔄 Döngü #{cycle} - {datetime.now().strftime('%H:%M:%S')}")

        try:
            result = update_live_scores()

            if result['skipped']:
                print(f"  ⏭️  Atlandı (tüm maçlar bitti veya veri yok)")
                # If all matches done, slow down polling
                if not run_once:
                    print(f"  💤 Tüm maçlar bitti, 10 dk bekleniyor...")
                    for _ in range(600):
                        if not running:
                            break
                        time.sleep(1)
                    continue
            elif result['success']:
                print(f"  ✅ Güncellendi: {result['live_matches']} canlı, "
                      f"{result['finished_matches']} bitti / {result['total_opportunities']} toplam")
            else:
                print(f"  ❌ Hata: {result.get('error', 'Bilinmeyen hata')}")

        except Exception as e:
            logger.error(f"Scheduler error: {e}")
            print(f"  ❌ Hata: {e}")

        if run_once:
            print("\n✅ Tek seferlik çalıştırma tamamlandı.")
            break

        # Wait for next cycle
        print(f"  ⏳ Sonraki güncelleme: {interval_seconds}s sonra")
        for _ in range(interval_seconds):
            if not running:
                break
            time.sleep(1)

    print("\n🛑 Scheduler durduruldu.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WestBetPro Live Score Scheduler")
    parser.add_argument(
        "--interval", type=int, default=120,
        help="Update interval in seconds (default: 120)"
    )
    parser.add_argument(
        "--once", action="store_true",
        help="Run once and exit"
    )

    args = parser.parse_args()
    run_scheduler(interval_seconds=args.interval, run_once=args.once)
