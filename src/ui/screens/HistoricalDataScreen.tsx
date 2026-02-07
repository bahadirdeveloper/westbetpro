'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

interface DateSummary {
  date: string;
  date_formatted: string;
  is_today: boolean;
  is_future: boolean;
  total: number;
  finished: number;
  won: number;
  lost: number;
  live: number;
  success_rate: number | null;
}

interface StatItem {
  total: number;
  won: number;
  lost: number;
  rate: number;
}

interface LeagueStat extends StatItem { league: string; }
interface TypeStat extends StatItem { type: string; }
interface ConfStat extends StatItem { range: string; }
interface TrendItem extends StatItem { date: string; date_formatted: string; }
interface RuleStat extends StatItem { rule_id: string; name: string; }

interface AllStats {
  overall: {
    total_predictions: number;
    finished: number;
    won: number;
    lost: number;
    pending: number;
    overall_rate: number;
    total_days: number;
  };
  by_league: LeagueStat[];
  by_type: TypeStat[];
  by_confidence: ConfStat[];
  daily_trend: TrendItem[];
  by_rule: RuleStat[];
}

interface Prediction {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  match_date_formatted: string;
  match_time: string;
  prediction: string;
  confidence: number;
  alternative_predictions: Array<{
    tahmin: string;
    guven: number;
    not: string;
  }>;
  matched_rules: Array<{
    kural_id: string;
    kural_adi: string;
  }>;
  note: string;
  home_score: number | null;
  away_score: number | null;
  halftime_home: number | null;
  halftime_away: number | null;
  is_live: boolean;
  is_finished: boolean;
  live_status: string;
  elapsed: number | null;
  prediction_result: string | null;
}

interface DateDetail {
  date: string;
  date_formatted: string;
  stats: {
    total: number;
    finished: number;
    won: number;
    lost: number;
    live: number;
    pending: number;
  };
  predictions: Prediction[];
}

// Turkish day names
const DAY_NAMES: Record<string, string> = {
  '0': 'Pazar',
  '1': 'Pazartesi',
  '2': 'Salı',
  '3': 'Çarşamba',
  '4': 'Perşembe',
  '5': 'Cuma',
  '6': 'Cumartesi',
};

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay().toString()] || '';
}

export default function HistoricalDataScreen() {
  const [dates, setDates] = useState<DateSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateDetail, setDateDetail] = useState<DateDetail | null>(null);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [activeTab, setActiveTab] = useState<'arsiv' | 'istatistik'>('arsiv');
  const [allStats, setAllStats] = useState<AllStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedPrediction) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedPrediction]);

  // Fetch available dates on mount
  useEffect(() => {
    async function fetchDates() {
      try {
        setLoadingDates(true);
        const res = await fetch('/api/history', { cache: 'no-store' });
        if (!res.ok) throw new Error(`API hatasi: ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setDates(data.dates || []);
          const pastDates = (data.dates || []).filter((d: DateSummary) => !d.is_future);
          if (pastDates.length > 0) {
            setSelectedDate(pastDates[0].date);
          }
        }
      } catch (e) {
        console.error('Failed to fetch dates:', e);
      } finally {
        setLoadingDates(false);
      }
    }
    fetchDates();
  }, []);

  // Fetch stats when stats tab is activated
  useEffect(() => {
    if (activeTab !== 'istatistik' || allStats) return;
    async function fetchStats() {
      try {
        setLoadingStats(true);
        const res = await fetch('/api/history?stats=all', { cache: 'no-store' });
        if (!res.ok) throw new Error(`API hatasi: ${res.status}`);
        const data = await res.json();
        if (data.success && data.stats) {
          setAllStats(data.stats);
        }
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, [activeTab, allStats]);

  // Fetch predictions when date is selected
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchDateDetail() {
      try {
        setLoadingDetail(true);
        setDateDetail(null);
        const res = await fetch(`/api/history?date=${selectedDate}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`API hatasi: ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setDateDetail(data);
        }
      } catch (e) {
        console.error('Failed to fetch date detail:', e);
      } finally {
        setLoadingDetail(false);
      }
    }
    fetchDateDetail();
  }, [selectedDate]);

  function getResultBadge(pred: Prediction) {
    if (pred.is_live) {
      return (
        <span className="text-[10px] px-2 py-1 bg-green-500 text-white rounded-md font-bold uppercase tracking-wider animate-pulse">
          CANLI {pred.elapsed ? `${pred.elapsed}'` : ''}
        </span>
      );
    }
    if (pred.is_finished) {
      if (pred.prediction_result === 'won') {
        return (
          <span className="text-[10px] px-2.5 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md font-bold uppercase tracking-wider">
            ✓ TUTTU
          </span>
        );
      } else if (pred.prediction_result === 'lost') {
        return (
          <span className="text-[10px] px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md font-bold uppercase tracking-wider">
            ✗ YATTI
          </span>
        );
      }
      return (
        <span className="text-[10px] px-2.5 py-1 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-md font-bold uppercase tracking-wider">
          BİTTİ
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2.5 py-1 bg-aged-gold/10 text-aged-gold border border-aged-gold/20 rounded-md font-bold uppercase tracking-wider">
        BEKLEMEDE
      </span>
    );
  }

  function getConfidenceColor(c: number): string {
    if (c >= 90) return 'text-primary';
    if (c >= 85) return 'text-aged-gold';
    return 'text-red-500';
  }

  function getConfidenceBg(c: number): string {
    if (c >= 90) return 'bg-primary/10 border-primary/20';
    if (c >= 85) return 'bg-aged-gold/10 border-aged-gold/20';
    return 'bg-red-500/10 border-red-500/20';
  }

  function getGaugeOffset(confidence: number): number {
    const circumference = 176;
    return circumference - (confidence / 100) * circumference;
  }

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="gecmis-veriler" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Arşiv" searchPlaceholder="Arşivde ara..." />

        <section className="p-4 sm:p-6 lg:p-8 pb-32 lg:pb-8">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-western text-white mb-2 tracking-wide uppercase">
              Gecmis Veriler
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Tamamlanmis duellolarin ve serif raporlarinin kayit defteri.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-card-dark rounded-xl p-1 border border-white/5 w-fit">
            <button
              onClick={() => setActiveTab('arsiv')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'arsiv'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="material-icons-round text-sm mr-1.5 align-middle">history</span>
              Arsiv
            </button>
            <button
              onClick={() => setActiveTab('istatistik')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'istatistik'
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="material-icons-round text-sm mr-1.5 align-middle">analytics</span>
              Istatistikler
            </button>
          </div>

          {/* ========== STATISTICS TAB ========== */}
          {activeTab === 'istatistik' && (
            <div>
              {loadingStats && (
                <div className="flex justify-center items-center py-20">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                    <p className="text-slate-400">Istatistikler hesaplaniyor...</p>
                  </div>
                </div>
              )}

              {!loadingStats && !allStats && (
                <div className="text-center py-16">
                  <span className="text-5xl mb-4 block">📊</span>
                  <p className="text-slate-400">Henuz yeterli veri yok.</p>
                </div>
              )}

              {!loadingStats && allStats && (
                <div className="space-y-6">
                  {/* Overall Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-card-dark p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">TOPLAM TAHMIN</p>
                      <p className="text-2xl font-western text-white">{allStats.overall.total_predictions}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{allStats.overall.total_days} gun</p>
                    </div>
                    <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/15">
                      <p className="text-[10px] text-green-400 uppercase tracking-wider font-bold mb-1">TUTTU</p>
                      <p className="text-2xl font-western text-green-400">{allStats.overall.won}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{allStats.overall.finished} bitten</p>
                    </div>
                    <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/15">
                      <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-1">YATTI</p>
                      <p className="text-2xl font-western text-red-400">{allStats.overall.lost}</p>
                    </div>
                    <div className={`p-4 rounded-xl border ${
                      allStats.overall.overall_rate >= 60
                        ? 'bg-primary/5 border-primary/15'
                        : 'bg-card-dark border-aged-gold/10'
                    }`}>
                      <p className="text-[10px] text-aged-gold uppercase tracking-wider font-bold mb-1">GENEL BASARI</p>
                      <p className={`text-2xl font-western ${
                        allStats.overall.overall_rate >= 60 ? 'text-primary' : 'text-aged-gold'
                      }`}>%{allStats.overall.overall_rate}</p>
                      <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-green-500 rounded-full h-full" style={{ width: `${allStats.overall.overall_rate}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Daily Trend */}
                  {allStats.daily_trend.length > 1 && (
                    <div className="bg-card-dark rounded-xl border border-white/5 p-4 sm:p-5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-aged-gold text-base">trending_up</span>
                        Gunluk Trend
                      </h3>
                      {/* Bar chart */}
                      <div className="flex items-end gap-1 h-32 sm:h-40">
                        {allStats.daily_trend.map((d) => {
                          const maxTotal = Math.max(...allStats.daily_trend.map(t => t.total));
                          const barHeight = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0;
                          const wonHeight = d.total > 0 ? (d.won / d.total) * barHeight : 0;
                          return (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                              {/* Tooltip */}
                              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {d.date_formatted}: {d.won}/{d.total} (%{d.rate})
                              </div>
                              {/* Bar */}
                              <div className="w-full flex flex-col justify-end" style={{ height: `${barHeight}%`, minHeight: '4px' }}>
                                <div className="w-full bg-green-500/80 rounded-t" style={{ height: `${wonHeight}%`, minHeight: d.won > 0 ? '2px' : '0' }} />
                                <div className="w-full bg-red-500/50 rounded-b" style={{ height: `${barHeight - wonHeight}%`, minHeight: d.lost > 0 ? '2px' : '0' }} />
                              </div>
                              {/* Label */}
                              <p className="text-[8px] text-slate-600 truncate w-full text-center">
                                {d.date.slice(5)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500/80"></span> Tuttu</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/50"></span> Yatti</span>
                      </div>
                    </div>
                  )}

                  {/* Two column layout for smaller stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* League Stats */}
                    <div className="bg-card-dark rounded-xl border border-white/5 p-4 sm:p-5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-aged-gold text-base">emoji_events</span>
                        Lig Bazli Basari
                      </h3>
                      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                        {allStats.by_league.slice(0, 15).map((l) => (
                          <div key={l.league} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{l.league}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                  <div className="bg-green-500 rounded-l-full h-full" style={{ width: `${l.rate}%` }} />
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-bold ${
                                l.rate >= 70 ? 'text-green-400' : l.rate >= 50 ? 'text-aged-gold' : 'text-red-400'
                              }`}>%{l.rate}</p>
                              <p className="text-[10px] text-slate-600">{l.won}/{l.total}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prediction Type Stats */}
                    <div className="bg-card-dark rounded-xl border border-white/5 p-4 sm:p-5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-aged-gold text-base">category</span>
                        Tahmin Tipi Bazli
                      </h3>
                      <div className="space-y-2">
                        {allStats.by_type.map((t) => (
                          <div key={t.type} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white">{t.type}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                  <div className="bg-green-500 rounded-l-full h-full" style={{ width: `${t.rate}%` }} />
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-bold ${
                                t.rate >= 70 ? 'text-green-400' : t.rate >= 50 ? 'text-aged-gold' : 'text-red-400'
                              }`}>%{t.rate}</p>
                              <p className="text-[10px] text-slate-600">{t.won}/{t.total}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Confidence Range Stats */}
                    <div className="bg-card-dark rounded-xl border border-white/5 p-4 sm:p-5">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-aged-gold text-base">speed</span>
                        Guven Araligi Analizi
                      </h3>
                      <div className="space-y-2">
                        {allStats.by_confidence.map((c) => (
                          <div key={c.range} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white font-mono">{c.range}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                  <div className="bg-green-500 rounded-l-full h-full" style={{ width: `${c.rate}%` }} />
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-sm font-bold ${
                                c.rate >= 70 ? 'text-green-400' : c.rate >= 50 ? 'text-aged-gold' : 'text-red-400'
                              }`}>%{c.rate}</p>
                              <p className="text-[10px] text-slate-600">{c.won}/{c.total}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rule Stats */}
                    {allStats.by_rule.length > 0 && (
                      <div className="bg-card-dark rounded-xl border border-white/5 p-4 sm:p-5">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <span className="material-icons-round text-aged-gold text-base">rule</span>
                          Kural Performansi
                        </h3>
                        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                          {allStats.by_rule.slice(0, 15).map((r) => (
                            <div key={r.rule_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                              <span className="text-[10px] px-1.5 py-0.5 bg-saddle-brown/20 text-saddle-brown rounded font-bold flex-shrink-0">
                                #{r.rule_id}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{r.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                    <div className="bg-green-500 rounded-l-full h-full" style={{ width: `${r.rate}%` }} />
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-bold ${
                                  r.rate >= 70 ? 'text-green-400' : r.rate >= 50 ? 'text-aged-gold' : 'text-red-400'
                                }`}>%{r.rate}</p>
                                <p className="text-[10px] text-slate-600">{r.won}/{r.total}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== ARCHIVE TAB ========== */}

          {/* Loading State */}
          {activeTab === 'arsiv' && loadingDates && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-slate-400">Arşiv yükleniyor...</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          {activeTab === 'arsiv' && !loadingDates && dates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="bg-card-dark border border-aged-gold/20 rounded-2xl p-12 text-center max-w-lg">
                <span className="material-icons-round text-6xl text-aged-gold/40 mb-6 block">history</span>
                <h3 className="font-western text-2xl text-aged-gold mb-4">ARŞİV BOŞ</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Henüz geçmiş veri bulunmuyor. Tahminler oluşturuldukça burada görünecek.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'arsiv' && !loadingDates && dates.length > 0 && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Date Selector - Left Panel (horizontal on mobile, sidebar on desktop) */}
              <div className="lg:w-72 xl:w-80 flex-shrink-0">
                <div className="bg-card-dark rounded-2xl border border-white/5 overflow-hidden lg:sticky lg:top-14">
                  <div className="p-3 lg:p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="material-icons-round text-aged-gold text-base">calendar_month</span>
                      Tarih Seçin
                    </h3>
                    <span className="text-[10px] text-slate-600 lg:hidden">{dates.length} gun</span>
                  </div>
                  {/* Mobile: Horizontal scroll */}
                  <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-2 p-3">
                    {dates.map((d) => {
                      const isSelected = selectedDate === d.date;
                      return (
                        <button
                          key={d.date}
                          onClick={() => setSelectedDate(d.date)}
                          className={`flex-shrink-0 px-3 py-2 rounded-lg text-center transition-all ${
                            isSelected
                              ? 'bg-primary/15 border border-primary/30 text-primary'
                              : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          <p className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-white'}`}>
                            {d.date_formatted}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5 justify-center">
                            <span className="text-[10px]">{d.total} mac</span>
                            {d.success_rate !== null && (
                              <span className={`text-[10px] font-bold ${
                                d.success_rate >= 70 ? 'text-green-400' :
                                d.success_rate >= 50 ? 'text-aged-gold' : 'text-red-400'
                              }`}>%{d.success_rate}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Desktop: Vertical list */}
                  <div className="hidden lg:block max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
                    {dates.map((d) => {
                      const isSelected = selectedDate === d.date;
                      const dayName = getDayName(d.date);

                      return (
                        <button
                          key={d.date}
                          onClick={() => setSelectedDate(d.date)}
                          className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-all ${
                            isSelected
                              ? 'bg-primary/10 border-l-2 border-l-primary'
                              : 'hover:bg-white/5 border-l-2 border-l-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-white'}`}>
                                {d.date_formatted}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {dayName}
                                {d.is_today && (
                                  <span className="ml-1.5 text-primary font-bold">• Bugün</span>
                                )}
                                {d.is_future && (
                                  <span className="ml-1.5 text-aged-gold font-bold">• Gelecek</span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                isSelected ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-400'
                              }`}>
                                {d.total}
                              </span>
                            </div>
                          </div>

                          {/* Mini Stats Bar */}
                          {d.finished > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                {d.won > 0 && (
                                  <div
                                    className="h-full bg-green-500 rounded-l-full"
                                    style={{ width: `${(d.won / d.total) * 100}%` }}
                                  />
                                )}
                                {d.lost > 0 && (
                                  <div
                                    className="h-full bg-red-500"
                                    style={{ width: `${(d.lost / d.total) * 100}%` }}
                                  />
                                )}
                              </div>
                              {d.success_rate !== null && (
                                <span className={`text-[10px] font-bold ${
                                  d.success_rate >= 70 ? 'text-green-400' :
                                  d.success_rate >= 50 ? 'text-aged-gold' : 'text-red-400'
                                }`}>
                                  %{d.success_rate}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Predictions Panel - Right */}
              <div className="flex-1 min-w-0">
                {/* Date Header & Stats */}
                {selectedDate && dateDetail && (
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                      <div className="bg-card-dark p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">TOPLAM</p>
                        <p className="text-2xl font-western text-white">{dateDetail.stats.total}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {dateDetail.stats.pending > 0 ? `${dateDetail.stats.pending} beklemede` : 'tumu degerlendirildi'}
                        </p>
                      </div>
                      <div className="bg-green-500/5 p-4 rounded-xl border border-green-500/15">
                        <p className="text-[10px] text-green-400 uppercase tracking-wider font-bold mb-1">TUTTU</p>
                        <p className="text-2xl font-western text-green-400">{dateDetail.stats.won}</p>
                      </div>
                      <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/15">
                        <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-1">YATTI</p>
                        <p className="text-2xl font-western text-red-400">{dateDetail.stats.lost}</p>
                      </div>
                      <div className={`p-4 rounded-xl border ${
                        dateDetail.stats.finished > 0 && (dateDetail.stats.won / dateDetail.stats.finished) >= 0.6
                          ? 'bg-primary/5 border-primary/15'
                          : 'bg-card-dark border-aged-gold/10'
                      }`}>
                        <p className="text-[10px] text-aged-gold uppercase tracking-wider font-bold mb-1">BASARI</p>
                        <p className={`text-2xl font-western ${
                          dateDetail.stats.finished > 0 && (dateDetail.stats.won / dateDetail.stats.finished) >= 0.6
                            ? 'text-primary'
                            : 'text-aged-gold'
                        }`}>
                          {dateDetail.stats.finished > 0
                            ? `%${Math.round((dateDetail.stats.won / dateDetail.stats.finished) * 100)}`
                            : '-'
                          }
                        </p>
                        {dateDetail.stats.finished > 0 && (
                          <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden flex">
                            <div className="bg-green-500 rounded-full" style={{ width: `${(dateDetail.stats.won / dateDetail.stats.finished) * 100}%` }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Date Title */}
                    <div className="flex items-center gap-3 mb-6">
                      <h3 className="text-xl font-western text-white">
                        {dateDetail.date_formatted}
                      </h3>
                      <span className="text-sm text-slate-500">
                        {getDayName(selectedDate)}
                      </span>
                      {dateDetail.stats.live > 0 && (
                        <span className="text-[10px] px-2 py-1 bg-green-500 text-white rounded-md font-bold animate-pulse">
                          {dateDetail.stats.live} CANLI
                        </span>
                      )}
                    </div>

                    {/* Loading Detail */}
                    {loadingDetail && (
                      <div className="flex justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </div>
                    )}

                    {/* Predictions List */}
                    {!loadingDetail && dateDetail.predictions.length > 0 && (
                      <div className="space-y-3">
                        {dateDetail.predictions.map((pred) => (
                          <div
                            key={pred.id}
                            className={`bg-card-dark rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${
                              pred.prediction_result === 'won'
                                ? 'border-green-500/20 hover:border-green-500/40'
                                : pred.prediction_result === 'lost'
                                ? 'border-red-500/20 hover:border-red-500/40'
                                : pred.is_live
                                ? 'border-green-500/30 hover:border-green-500/50'
                                : 'border-white/5 hover:border-aged-gold/20'
                            }`}
                            onClick={() => setSelectedPrediction(pred)}
                          >
                            <div className="p-4 md:p-5">
                              <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Left: Match Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-[10px] px-2 py-0.5 bg-white/5 text-slate-500 rounded font-bold uppercase tracking-wider">
                                      {pred.league}
                                    </span>
                                    <span className="text-[10px] text-slate-600">
                                      {pred.match_time}
                                    </span>
                                    {getResultBadge(pred)}
                                  </div>

                                  {/* Teams & Score */}
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                      <p className="text-base font-bold text-white truncate">
                                        {pred.home_team} - {pred.away_team}
                                      </p>
                                    </div>

                                    {/* Score */}
                                    {(pred.is_live || pred.is_finished) && pred.home_score !== null && pred.away_score !== null && (
                                      <div className="flex-shrink-0 text-center">
                                        <p className={`text-xl font-western ${pred.is_live ? 'text-green-400' : 'text-white'}`}>
                                          {pred.home_score} - {pred.away_score}
                                        </p>
                                        {pred.halftime_home !== null && pred.halftime_away !== null && (
                                          <p className="text-[10px] text-slate-500">
                                            İY: {pred.halftime_home}-{pred.halftime_away}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right: Prediction & Confidence */}
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <div className="text-right">
                                    <p className={`text-sm font-bold ${
                                      pred.prediction_result === 'won'
                                        ? 'text-green-400'
                                        : pred.prediction_result === 'lost'
                                        ? 'text-red-400 line-through'
                                        : 'text-primary'
                                    }`}>
                                      {pred.prediction}
                                    </p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                                      Tahmin
                                    </p>
                                  </div>

                                  {/* Mini Gauge */}
                                  <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-full h-full -rotate-90">
                                      <circle
                                        className="text-white/5"
                                        cx="24" cy="24" fill="transparent" r="20"
                                        stroke="currentColor" strokeWidth="3"
                                      />
                                      <circle
                                        className={getConfidenceColor(pred.confidence)}
                                        cx="24" cy="24" fill="transparent" r="20"
                                        stroke="currentColor"
                                        strokeDasharray="126"
                                        strokeDashoffset={126 - (pred.confidence / 100) * 126}
                                        strokeWidth="3"
                                      />
                                    </svg>
                                    <span className="absolute text-[10px] font-bold text-white">
                                      {pred.confidence}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty State for selected date */}
                    {!loadingDetail && dateDetail.predictions.length === 0 && (
                      <div className="text-center py-16">
                        <span className="text-5xl mb-4 block">🌵</span>
                        <p className="text-slate-400">Bu tarihte tahmin bulunmuyor.</p>
                      </div>
                    )}
                  </>
                )}

                {/* No date selected */}
                {!selectedDate && !loadingDates && (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <span className="material-icons-round text-6xl text-aged-gold/30 mb-4 block">
                        touch_app
                      </span>
                      <p className="text-slate-400">Tahminleri görüntülemek için bir tarih seçin.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      <MobileNav activeTab="gecmis-veriler" />

      {/* Prediction Detail Modal - Portal to body */}
      {selectedPrediction && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setSelectedPrediction(null)}
        >
          <div
            className="bg-card-dark rounded-t-2xl sm:rounded-2xl border border-white/10 w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-card-dark border-b border-white/10 p-4 sm:p-6 z-10">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-western text-white mb-2 truncate">
                    {selectedPrediction.home_team} vs {selectedPrediction.away_team}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-white/5 text-slate-400 rounded-md font-bold uppercase">
                      {selectedPrediction.league}
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedPrediction.match_date_formatted} • {selectedPrediction.match_time}
                    </span>
                    {getResultBadge(selectedPrediction)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPrediction(null)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <span className="material-icons-round text-slate-400">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Score (if available) */}
              {(selectedPrediction.is_live || selectedPrediction.is_finished) &&
                selectedPrediction.home_score !== null && selectedPrediction.away_score !== null && (
                <div className="bg-white/5 p-5 rounded-xl border border-white/10 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-3">
                    {selectedPrediction.is_live ? 'CANLI SKOR' : 'MAÇ SONUCU'}
                  </p>
                  <p className={`text-4xl font-western ${selectedPrediction.is_live ? 'text-green-400' : 'text-white'}`}>
                    {selectedPrediction.home_score} - {selectedPrediction.away_score}
                  </p>
                  {selectedPrediction.halftime_home !== null && selectedPrediction.halftime_away !== null && (
                    <p className="text-sm text-slate-400 mt-2">
                      İlk Yarı: {selectedPrediction.halftime_home} - {selectedPrediction.halftime_away}
                    </p>
                  )}
                  {selectedPrediction.is_live && selectedPrediction.elapsed && (
                    <p className="text-sm text-green-400 mt-1">{selectedPrediction.elapsed}&apos; dakika</p>
                  )}
                </div>
              )}

              {/* Main Prediction */}
              <div className={`p-4 rounded-xl border ${
                selectedPrediction.prediction_result === 'won'
                  ? 'bg-green-500/10 border-green-500/20'
                  : selectedPrediction.prediction_result === 'lost'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-primary/10 border-primary/20'
              }`}>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">
                  Ana Tahmin
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className={`text-2xl font-western ${
                      selectedPrediction.prediction_result === 'won'
                        ? 'text-green-400'
                        : selectedPrediction.prediction_result === 'lost'
                        ? 'text-red-400 line-through'
                        : 'text-primary'
                    }`}>
                      {selectedPrediction.prediction}
                    </p>
                    {selectedPrediction.prediction_result === 'won' && (
                      <span className="text-2xl">✅</span>
                    )}
                    {selectedPrediction.prediction_result === 'lost' && (
                      <span className="text-2xl">❌</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle className="text-white/5" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" strokeWidth="4" />
                        <circle
                          className={getConfidenceColor(selectedPrediction.confidence)}
                          cx="32" cy="32" fill="transparent" r="28" stroke="currentColor"
                          strokeDasharray="176"
                          strokeDashoffset={getGaugeOffset(selectedPrediction.confidence)}
                          strokeWidth="4"
                        />
                      </svg>
                      <span className="absolute text-xs font-bold">{selectedPrediction.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternative Predictions */}
              {selectedPrediction.alternative_predictions && selectedPrediction.alternative_predictions.length > 0 && (
                <div>
                  <h4 className="text-lg font-western text-white mb-3 flex items-center gap-2">
                    <span className="material-icons-round text-aged-gold">auto_awesome</span>
                    Alternatif Tahminler
                  </h4>
                  <div className="space-y-2">
                    {selectedPrediction.alternative_predictions.map((alt, index) => (
                      <div key={index} className="bg-white/5 p-3 rounded-lg border border-white/5 hover:border-aged-gold/20 transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-white font-bold">{alt.tahmin}</p>
                            {alt.not && <p className="text-xs text-slate-400 mt-1">{alt.not}</p>}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xl font-bold text-aged-gold">{alt.guven}%</p>
                            <p className="text-xs text-slate-500">Güven</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Rules */}
              {selectedPrediction.matched_rules && selectedPrediction.matched_rules.length > 0 && (
                <div>
                  <h4 className="text-lg font-western text-white mb-3 flex items-center gap-2">
                    <span className="material-icons-round text-saddle-brown">rule</span>
                    Eşleşen Kurallar
                  </h4>
                  <div className="space-y-2">
                    {selectedPrediction.matched_rules.map((rule, index) => (
                      <div key={index} className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-saddle-brown/20 text-saddle-brown rounded font-bold">
                            #{rule.kural_id}
                          </span>
                          <p className="text-white text-sm">{rule.kural_adi}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              {selectedPrediction.note && (
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">Not</p>
                  <p className="text-sm text-slate-300">{selectedPrediction.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
