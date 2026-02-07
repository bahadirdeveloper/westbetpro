'use client';

import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

interface Stats {
  totalPredictions: number;
  finishedPredictions: number;
  wonPredictions: number;
  lostPredictions: number;
  pendingPredictions: number;
  successRate: number;
  avgConfidence: number;
  // ROI calculation
  totalBets: number;
  totalWon: number;
  roiPercent: number;
  // By confidence range
  ranges: Array<{
    range: string;
    total: number;
    won: number;
    rate: number;
  }>;
  // By source
  sources: Array<{
    source: string;
    total: number;
    won: number;
    rate: number;
  }>;
  // Daily trend
  daily: Array<{
    date: string;
    total: number;
    won: number;
    rate: number;
  }>;
}

export default function ROICalculatorScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitStake, setUnitStake] = useState(100);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/history?stats=all');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();

        // Process stats
        const all = data.stats;
        if (!all) throw new Error('No stats');

        const ov = all.overall || {};
        const finished = ov.finished || 0;
        const won = ov.won || 0;
        const lost = ov.lost || 0;
        const total = ov.total_predictions || 0;
        const rate = finished > 0 ? (won / finished) * 100 : 0;

        // Assume flat odds of 1.85 average for ROI calculation
        const avgOdds = 1.85;
        const totalStaked = finished;
        const totalReturn = won * avgOdds;
        const roi = totalStaked > 0 ? ((totalReturn - totalStaked) / totalStaked) * 100 : 0;

        // Confidence ranges
        const confRanges = (all.by_confidence || []).map((c: any) => ({
          range: c.range,
          total: c.total,
          won: c.won,
          rate: c.rate || (c.total > 0 ? Math.round((c.won / c.total) * 100) : 0),
        }));

        // Daily trend (last 14 days)
        const dailyTrend = (all.daily_trend || []).map((d: any) => ({
          date: d.date,
          total: d.total,
          won: d.won,
          rate: d.rate || (d.total > 0 ? Math.round((d.won / d.total) * 100) : 0),
        }));

        setStats({
          totalPredictions: total,
          finishedPredictions: finished,
          wonPredictions: won,
          lostPredictions: lost,
          pendingPredictions: total - finished,
          successRate: rate,
          avgConfidence: 0,
          totalBets: totalStaked,
          totalWon: won,
          roiPercent: roi,
          ranges: confRanges,
          sources: [],
          daily: dailyTrend,
        });
      } catch {
        // Create empty stats if no data
        setStats({
          totalPredictions: 0,
          finishedPredictions: 0,
          wonPredictions: 0,
          lostPredictions: 0,
          pendingPredictions: 0,
          successRate: 0,
          avgConfidence: 0,
          totalBets: 0,
          totalWon: 0,
          roiPercent: 0,
          ranges: [],
          sources: [],
          daily: [],
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const profit = stats ? (stats.wonPredictions * 1.85 - stats.finishedPredictions) * unitStake : 0;
  const invested = stats ? stats.finishedPredictions * unitStake : 0;

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="roi-hesaplayici" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="ROI Hesaplayici" searchPlaceholder="Araclarda ara..." />

        <section className="p-4 sm:p-6 lg:p-8 pb-32 lg:pb-8">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-western text-white mb-2 tracking-wide">ROI Hesaplayici</h2>
            <p className="text-slate-400 text-sm">Gerçek tahmin verilerine dayalı yatırım getirisi analizi</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Unit Stake Input */}
              <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-4 flex items-center gap-4">
                <span className="material-icons-round text-aged-gold text-xl">payments</span>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">Birim Bahis (TL)</label>
                  <input
                    type="number"
                    min={1}
                    value={unitStake}
                    onChange={(e) => setUnitStake(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-32 text-sm"
                  />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Toplam Yatırım</p>
                  <p className="text-lg font-bold text-white">{invested.toLocaleString('tr-TR')} TL</p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 text-center">
                  <span className="material-icons-round text-primary text-2xl mb-1 block">analytics</span>
                  <p className="text-2xl font-bold text-primary">%{stats.successRate.toFixed(1)}</p>
                  <p className="text-slate-500 text-xs">Başarı Oranı</p>
                </div>
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 text-center">
                  <span className={`material-icons-round text-2xl mb-1 block ${stats.roiPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.roiPercent >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                  <p className={`text-2xl font-bold ${stats.roiPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.roiPercent >= 0 ? '+' : ''}{stats.roiPercent.toFixed(1)}%
                  </p>
                  <p className="text-slate-500 text-xs">ROI</p>
                </div>
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 text-center">
                  <span className={`material-icons-round text-2xl mb-1 block ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profit >= 0 ? 'add_circle' : 'remove_circle'}
                  </span>
                  <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toLocaleString('tr-TR')} TL
                  </p>
                  <p className="text-slate-500 text-xs">Net Kar/Zarar</p>
                </div>
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 text-center">
                  <span className="material-icons-round text-aged-gold text-2xl mb-1 block">sports_score</span>
                  <p className="text-2xl font-bold text-white">{stats.wonPredictions}/{stats.finishedPredictions}</p>
                  <p className="text-slate-500 text-xs">Kazanan/Toplam</p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Win/Loss Meter */}
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm">donut_large</span>
                    Sonuç Dağılımı
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-400 font-bold">Kazanan ({stats.wonPredictions})</span>
                        <span className="text-slate-400">{stats.finishedPredictions > 0 ? ((stats.wonPredictions / stats.finishedPredictions) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${stats.finishedPredictions > 0 ? (stats.wonPredictions / stats.finishedPredictions) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-red-400 font-bold">Kaybeden ({stats.lostPredictions})</span>
                        <span className="text-slate-400">{stats.finishedPredictions > 0 ? ((stats.lostPredictions / stats.finishedPredictions) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full transition-all"
                          style={{ width: `${stats.finishedPredictions > 0 ? (stats.lostPredictions / stats.finishedPredictions) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400 font-bold">Bekleyen ({stats.pendingPredictions})</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-500 rounded-full transition-all"
                          style={{ width: `${stats.totalPredictions > 0 ? (stats.pendingPredictions / stats.totalPredictions) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confidence Performance */}
                {stats.ranges.length > 0 && (
                  <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                    <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                      <span className="material-icons-round text-aged-gold text-sm">speed</span>
                      Güven Aralığı Performansı
                    </h3>
                    <div className="space-y-2">
                      {stats.ranges.map((r, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                          <span className="text-xs font-bold text-white">%{r.range}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400">{r.won}/{r.total}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              r.rate >= 70 ? 'text-green-400 bg-green-500/10' :
                              r.rate >= 50 ? 'text-yellow-400 bg-yellow-500/10' :
                              'text-red-400 bg-red-500/10'
                            }`}>
                              %{r.rate.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Trend */}
              {stats.daily.length > 0 && (
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm">show_chart</span>
                    Son 14 Gün Trend
                  </h3>
                  <div className="flex items-end gap-1 h-32">
                    {stats.daily.map((d, i) => {
                      const maxTotal = Math.max(...stats.daily.map(x => x.total), 1);
                      const height = (d.total / maxTotal) * 100;
                      const wonHeight = d.total > 0 ? (d.won / d.total) * height : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card-dark border border-white/10 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {d.date.slice(5)}: {d.won}/{d.total} (%{d.rate.toFixed(0)})
                          </div>
                          <div className="w-full relative" style={{ height: `${height}%`, minHeight: '4px' }}>
                            <div className="absolute bottom-0 w-full bg-red-500/40 rounded-t" style={{ height: '100%' }} />
                            <div className="absolute bottom-0 w-full bg-green-500 rounded-t" style={{ height: `${wonHeight}%` }} />
                          </div>
                          <span className="text-[8px] text-slate-600 rotate-[-45deg] origin-top-left mt-1">
                            {d.date.slice(8)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-[10px]">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /><span className="text-slate-400">Kazanan</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500/40 rounded" /><span className="text-slate-400">Kaybeden</span></div>
                  </div>
                </div>
              )}

              {/* ROI Note */}
              <div className="bg-white/5 rounded-xl p-4 text-xs text-slate-500">
                <span className="material-icons-round text-xs align-middle mr-1">info</span>
                ROI hesaplaması ortalama 1.85 oran üzerinden yapılmıştır. Gerçek ROI, oynadığınız oranlara göre değişir.
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <MobileNav activeTab="roi-hesaplayici" />
    </div>
  );
}
