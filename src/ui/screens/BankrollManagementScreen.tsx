'use client';

import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

interface DayRecord {
  date: string;
  total: number;
  won: number;
  lost: number;
  rate: number;
  profit: number;       // net profit for day (units)
  cumulative: number;   // cumulative bankroll
}

interface BankrollStats {
  startingBankroll: number;
  currentBankroll: number;
  totalProfit: number;
  totalBets: number;
  totalWon: number;
  totalLost: number;
  successRate: number;
  roiPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  bestDay: DayRecord | null;
  worstDay: DayRecord | null;
  winStreak: number;
  loseStreak: number;
  currentStreak: { type: 'win' | 'lose' | 'none'; count: number };
  dailyHistory: DayRecord[];
  avgDailyProfit: number;
  profitableDays: number;
  losingDays: number;
  sharpeRatio: number;
  kellyPercent: number;
}

type Strategy = 'flat' | 'percentage' | 'kelly';

export default function BankrollManagementScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BankrollStats | null>(null);
  const [startingBank, setStartingBank] = useState(10000);
  const [unitStake, setUnitStake] = useState(100);
  const [strategy, setStrategy] = useState<Strategy>('flat');
  const [avgOdds, setAvgOdds] = useState(1.85);

  useEffect(() => {
    fetchData();
  }, [startingBank, unitStake, strategy, avgOdds]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch('/api/history?stats=all');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      if (!data.stats) {
        setStats(null);
        return;
      }

      const s = data.stats;
      const dailyTrend: Array<{ date: string; total: number; won: number; lost: number; rate: number }> = s.daily_trend || [];
      const overall = s.overall || {};

      if (dailyTrend.length === 0) {
        setStats(null);
        return;
      }

      // Simulate bankroll growth day by day
      let bankroll = startingBank;
      let peak = startingBank;
      let maxDD = 0;
      let maxDDPercent = 0;
      let winStreak = 0;
      let loseStreak = 0;
      let currentWinStreak = 0;
      let currentLoseStreak = 0;
      let bestDay: DayRecord | null = null;
      let worstDay: DayRecord | null = null;
      let profitableDays = 0;
      let losingDays = 0;
      const dailyProfits: number[] = [];

      const dailyHistory: DayRecord[] = [];

      for (const day of dailyTrend) {
        let dayProfit = 0;

        if (strategy === 'flat') {
          // Flat: fixed unitStake per bet
          const stakePerBet = unitStake;
          dayProfit = (day.won * stakePerBet * (avgOdds - 1)) - (day.lost * stakePerBet);
        } else if (strategy === 'percentage') {
          // Percentage: bet 2% of current bankroll
          const pct = 0.02;
          const stakePerBet = bankroll * pct;
          dayProfit = (day.won * stakePerBet * (avgOdds - 1)) - (day.lost * stakePerBet);
        } else if (strategy === 'kelly') {
          // Kelly: optimal fraction based on edge
          const winRate = overall.finished > 0 ? (overall.won / overall.finished) : 0.5;
          const b = avgOdds - 1;
          const q = 1 - winRate;
          const kellyFraction = Math.max(0, Math.min(0.25, (b * winRate - q) / b));
          const stakePerBet = bankroll * kellyFraction;
          dayProfit = (day.won * stakePerBet * b) - (day.lost * stakePerBet);
        }

        bankroll += dayProfit;
        if (bankroll < 0) bankroll = 0;

        dailyProfits.push(dayProfit);

        const record: DayRecord = {
          date: day.date,
          total: day.total,
          won: day.won,
          lost: day.lost,
          rate: day.rate,
          profit: dayProfit,
          cumulative: bankroll,
        };
        dailyHistory.push(record);

        // Track peaks and drawdowns
        if (bankroll > peak) peak = bankroll;
        const dd = peak - bankroll;
        if (dd > maxDD) {
          maxDD = dd;
          maxDDPercent = peak > 0 ? (dd / peak) * 100 : 0;
        }

        // Streaks
        if (day.won > day.lost) {
          currentWinStreak++;
          currentLoseStreak = 0;
          if (currentWinStreak > winStreak) winStreak = currentWinStreak;
        } else if (day.lost > day.won) {
          currentLoseStreak++;
          currentWinStreak = 0;
          if (currentLoseStreak > loseStreak) loseStreak = currentLoseStreak;
        }

        // Best/worst days
        if (dayProfit > 0) profitableDays++;
        if (dayProfit < 0) losingDays++;
        if (!bestDay || dayProfit > bestDay.profit) bestDay = record;
        if (!worstDay || dayProfit < worstDay.profit) worstDay = record;
      }

      const totalProfit = bankroll - startingBank;
      const roiPercent = startingBank > 0 ? (totalProfit / startingBank) * 100 : 0;
      const avgDaily = dailyProfits.length > 0 ? dailyProfits.reduce((a, b) => a + b, 0) / dailyProfits.length : 0;

      // Sharpe ratio (simplified: daily returns)
      const dailyReturns = dailyProfits.map(p => p / startingBank);
      const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / (dailyReturns.length || 1);
      const stdDev = Math.sqrt(dailyReturns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / (dailyReturns.length || 1));
      const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

      // Kelly %
      const winRate = overall.finished > 0 ? (overall.won / overall.finished) : 0;
      const b = avgOdds - 1;
      const q = 1 - winRate;
      const kellyPercent = b > 0 ? Math.max(0, (b * winRate - q) / b) * 100 : 0;

      const currentStreak = currentWinStreak > 0
        ? { type: 'win' as const, count: currentWinStreak }
        : currentLoseStreak > 0
          ? { type: 'lose' as const, count: currentLoseStreak }
          : { type: 'none' as const, count: 0 };

      setStats({
        startingBankroll: startingBank,
        currentBankroll: bankroll,
        totalProfit,
        totalBets: overall.finished || 0,
        totalWon: overall.won || 0,
        totalLost: overall.lost || 0,
        successRate: overall.overall_rate || 0,
        roiPercent,
        maxDrawdown: maxDD,
        maxDrawdownPercent: maxDDPercent,
        bestDay,
        worstDay,
        winStreak,
        loseStreak,
        currentStreak,
        dailyHistory,
        avgDailyProfit: avgDaily,
        profitableDays,
        losingDays,
        sharpeRatio: sharpe,
        kellyPercent,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="kasa-yonetimi" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Kasa Yonetimi" searchPlaceholder="Kasa araçlarında ara..." />

        <section className="p-4 sm:p-6 lg:p-8 pb-32 lg:pb-8">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-western text-white mb-2 tracking-wide uppercase">Kasa Yonetimi ve Strateji</h2>
            <p className="text-slate-400 text-sm">Gerçek tahmin verilerine dayalı bankroll simülasyonu ve strateji analizi</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : !stats ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-card-dark border border-aged-gold/20 rounded-2xl p-8 text-center max-w-lg">
                <span className="material-icons-round text-5xl text-aged-gold/40 mb-4 block">account_balance</span>
                <h3 className="font-western text-xl text-aged-gold mb-3">VERİ YOK</h3>
                <p className="text-slate-400 text-sm">Henüz sonuçlanmış tahmin verisi bulunmuyor. Tahminler sonuçlandıkça kasa analizi otomatik olarak güncellenecek.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Settings Bar */}
              <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Başlangıç Kasası (TL)</label>
                    <input
                      type="number"
                      min={100}
                      value={startingBank}
                      onChange={(e) => setStartingBank(Math.max(100, parseInt(e.target.value) || 100))}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Birim Bahis (TL)</label>
                    <input
                      type="number"
                      min={1}
                      value={unitStake}
                      onChange={(e) => setUnitStake(Math.max(1, parseInt(e.target.value) || 1))}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Ortalama Oran</label>
                    <input
                      type="number"
                      min={1.01}
                      step={0.05}
                      value={avgOdds}
                      onChange={(e) => setAvgOdds(Math.max(1.01, parseFloat(e.target.value) || 1.85))}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Strateji</label>
                    <select
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value as Strategy)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full text-sm"
                    >
                      <option value="flat">Sabit Bahis</option>
                      <option value="percentage">%2 Kasa</option>
                      <option value="kelly">Kelly Criterion</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Main Bankroll Card */}
              <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-slate-400 text-xs mb-1">Mevcut Kasa</p>
                    <p className={`text-3xl sm:text-4xl font-bold ${stats.currentBankroll >= stats.startingBankroll ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.currentBankroll.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-slate-500 text-[10px]">Başlangıç</p>
                      <p className="text-white font-bold">{stats.startingBankroll.toLocaleString('tr-TR')} TL</p>
                    </div>
                    <span className="material-icons-round text-slate-600">arrow_forward</span>
                    <div className="text-center">
                      <p className="text-slate-500 text-[10px]">Net Kar/Zarar</p>
                      <p className={`font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 text-center">
                  <span className="material-icons-round text-primary text-xl mb-1 block">percent</span>
                  <p className={`text-xl font-bold ${stats.roiPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.roiPercent >= 0 ? '+' : ''}{stats.roiPercent.toFixed(1)}%
                  </p>
                  <p className="text-slate-500 text-xs">ROI</p>
                </div>
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 text-center">
                  <span className="material-icons-round text-aged-gold text-xl mb-1 block">analytics</span>
                  <p className="text-xl font-bold text-white">%{stats.successRate}</p>
                  <p className="text-slate-500 text-xs">Başarı Oranı</p>
                </div>
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 text-center">
                  <span className="material-icons-round text-blue-400 text-xl mb-1 block">sports_score</span>
                  <p className="text-xl font-bold text-white">{stats.totalWon}/{stats.totalBets}</p>
                  <p className="text-slate-500 text-xs">Kazanan/Toplam</p>
                </div>
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 text-center">
                  <span className="material-icons-round text-red-400 text-xl mb-1 block">trending_down</span>
                  <p className="text-xl font-bold text-red-400">
                    -{stats.maxDrawdown.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                  </p>
                  <p className="text-slate-500 text-xs">Maks. Düşüş</p>
                </div>
              </div>

              {/* Equity Curve Chart */}
              {stats.dailyHistory.length > 0 && (
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm">show_chart</span>
                    Kasa Büyüme Eğrisi
                  </h3>
                  <div className="relative h-40">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-[9px] text-slate-600">
                      <span>{Math.max(...stats.dailyHistory.map(d => d.cumulative)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                      <span>{stats.startingBankroll.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                      <span>{Math.min(...stats.dailyHistory.map(d => d.cumulative)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                    </div>
                    {/* Chart area */}
                    <div className="ml-16 h-full flex items-end gap-px">
                      {stats.dailyHistory.map((d, i) => {
                        const max = Math.max(...stats.dailyHistory.map(x => x.cumulative));
                        const min = Math.min(...stats.dailyHistory.map(x => x.cumulative), stats.startingBankroll * 0.8);
                        const range = max - min || 1;
                        const height = ((d.cumulative - min) / range) * 100;
                        const isAboveStart = d.cumulative >= stats.startingBankroll;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                            <div
                              className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card-dark border border-white/10 rounded px-2 py-1 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                              {d.date.slice(5)}: {d.cumulative.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                            </div>
                            <div
                              className={`w-full rounded-t transition-all ${isAboveStart ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ height: `${Math.max(height, 2)}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* Starting line */}
                    <div
                      className="absolute left-16 right-0 border-t border-dashed border-aged-gold/30"
                      style={{
                        bottom: (() => {
                          const max = Math.max(...stats.dailyHistory.map(x => x.cumulative));
                          const min = Math.min(...stats.dailyHistory.map(x => x.cumulative), stats.startingBankroll * 0.8);
                          const range = max - min || 1;
                          return `${((stats.startingBankroll - min) / range) * 100}%`;
                        })(),
                      }}
                    />
                  </div>
                  <div className="ml-16 flex justify-between mt-2 text-[8px] text-slate-600">
                    <span>{stats.dailyHistory[0]?.date.slice(5)}</span>
                    <span className="text-aged-gold/50">— Başlangıç</span>
                    <span>{stats.dailyHistory[stats.dailyHistory.length - 1]?.date.slice(5)}</span>
                  </div>
                </div>
              )}

              {/* Daily P&L */}
              {stats.dailyHistory.length > 0 && (
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-aged-gold text-sm">bar_chart</span>
                    Günlük Kar/Zarar
                  </h3>
                  <div className="flex items-center gap-px h-24">
                    {stats.dailyHistory.map((d, i) => {
                      const maxProfit = Math.max(...stats.dailyHistory.map(x => Math.abs(x.profit)), 1);
                      const height = (Math.abs(d.profit) / maxProfit) * 50;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-center">
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-card-dark border border-white/10 rounded px-2 py-0.5 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {d.date.slice(5)}: {d.profit >= 0 ? '+' : ''}{d.profit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                          </div>
                          {d.profit >= 0 ? (
                            <div className="w-full flex flex-col justify-end" style={{ height: '50%' }}>
                              <div className="w-full bg-green-500 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} />
                            </div>
                          ) : (
                            <>
                              <div style={{ height: '50%' }} />
                              <div className="w-full bg-red-500 rounded-b" style={{ height: `${Math.max(height, 2)}%` }} />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-px bg-white/10 mx-0" />
                </div>
              )}

              {/* Advanced Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Risk Metrics */}
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-red-400 text-sm">shield</span>
                    Risk Metrikleri
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400">Maks. Düşüş (Drawdown)</span>
                      <span className="text-xs font-bold text-red-400">
                        %{stats.maxDrawdownPercent.toFixed(1)} ({stats.maxDrawdown.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL)
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400">Sharpe Oranı</span>
                      <span className={`text-xs font-bold ${stats.sharpeRatio >= 1 ? 'text-green-400' : stats.sharpeRatio >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {stats.sharpeRatio.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400">Kelly Criterion</span>
                      <span className={`text-xs font-bold ${stats.kellyPercent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        %{stats.kellyPercent.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400">Ort. Günlük Kar</span>
                      <span className={`text-xs font-bold ${stats.avgDailyProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.avgDailyProfit >= 0 ? '+' : ''}{stats.avgDailyProfit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                      </span>
                    </div>
                  </div>
                </div>

                {/* Streak & Performance */}
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm">local_fire_department</span>
                    Seri ve Performans
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400">Mevcut Seri</span>
                      <span className={`text-xs font-bold ${
                        stats.currentStreak.type === 'win' ? 'text-green-400' :
                        stats.currentStreak.type === 'lose' ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {stats.currentStreak.type === 'win' ? `${stats.currentStreak.count} gün kazanç` :
                         stats.currentStreak.type === 'lose' ? `${stats.currentStreak.count} gün kayıp` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400">En Uzun Kazanç Serisi</span>
                      <span className="text-xs font-bold text-green-400">{stats.winStreak} gün</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400">En Uzun Kayıp Serisi</span>
                      <span className="text-xs font-bold text-red-400">{stats.loseStreak} gün</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-400">Karlı/Zararlı Günler</span>
                      <span className="text-xs font-bold">
                        <span className="text-green-400">{stats.profitableDays}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-red-400">{stats.losingDays}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best/Worst Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.bestDay && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-icons-round text-green-400 text-lg">emoji_events</span>
                      <span className="text-green-400 font-bold text-sm">En İyi Gün</span>
                    </div>
                    <p className="text-white font-bold">{stats.bestDay.date}</p>
                    <p className="text-green-400 text-lg font-bold">
                      +{stats.bestDay.profit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </p>
                    <p className="text-slate-400 text-xs">{stats.bestDay.won}/{stats.bestDay.total} kazanan • %{stats.bestDay.rate}</p>
                  </div>
                )}
                {stats.worstDay && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-icons-round text-red-400 text-lg">sentiment_very_dissatisfied</span>
                      <span className="text-red-400 font-bold text-sm">En Kötü Gün</span>
                    </div>
                    <p className="text-white font-bold">{stats.worstDay.date}</p>
                    <p className="text-red-400 text-lg font-bold">
                      {stats.worstDay.profit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                    </p>
                    <p className="text-slate-400 text-xs">{stats.worstDay.won}/{stats.worstDay.total} kazanan • %{stats.worstDay.rate}</p>
                  </div>
                )}
              </div>

              {/* Strategy Comparison */}
              <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                  <span className="material-icons-round text-aged-gold text-sm">compare_arrows</span>
                  Strateji Karşılaştırması
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sabit Bahis', key: 'flat', desc: `Her maça ${unitStake} TL` },
                    { label: '%2 Kasa', key: 'percentage', desc: 'Kasanın %2\'si' },
                    { label: 'Kelly', key: 'kelly', desc: 'Optimal oran' },
                  ].map(s => (
                    <div
                      key={s.key}
                      onClick={() => setStrategy(s.key as Strategy)}
                      className={`rounded-xl p-3 text-center cursor-pointer transition-all ${
                        strategy === s.key
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-white/5 border border-white/5 hover:border-white/10'
                      }`}
                    >
                      <p className={`text-sm font-bold ${strategy === s.key ? 'text-primary' : 'text-white'}`}>{s.label}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily History Table */}
              {stats.dailyHistory.length > 0 && (
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm">calendar_month</span>
                    Günlük Detay
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-white/5">
                          <th className="text-left py-2 px-2">Tarih</th>
                          <th className="text-center py-2 px-2">Maç</th>
                          <th className="text-center py-2 px-2">K/T</th>
                          <th className="text-center py-2 px-2">Oran</th>
                          <th className="text-right py-2 px-2">K/Z</th>
                          <th className="text-right py-2 px-2">Kasa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...stats.dailyHistory].reverse().map((d, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2 px-2 text-white">{d.date.slice(5)}</td>
                            <td className="py-2 px-2 text-center text-slate-400">{d.total}</td>
                            <td className="py-2 px-2 text-center">
                              <span className="text-green-400">{d.won}</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-slate-300">{d.total}</span>
                            </td>
                            <td className="py-2 px-2 text-center text-slate-400">%{d.rate}</td>
                            <td className={`py-2 px-2 text-right font-bold ${d.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {d.profit >= 0 ? '+' : ''}{d.profit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2 px-2 text-right text-white font-mono">
                              {d.cumulative.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Info Note */}
              <div className="bg-white/5 rounded-xl p-4 text-xs text-slate-500">
                <span className="material-icons-round text-xs align-middle mr-1">info</span>
                Simülasyon gerçek tahmin verilerine dayalıdır. Ortalama oran ({avgOdds}) ve seçilen strateji ({
                  strategy === 'flat' ? 'Sabit Bahis' : strategy === 'percentage' ? '%2 Kasa' : 'Kelly'
                }) üzerinden hesaplanmıştır. Gerçek sonuçlar farklılık gösterebilir.
              </div>
            </div>
          )}
        </section>
      </main>

      <MobileNav activeTab="kasa-yonetimi" />
    </div>
  );
}
