'use client';

/**
 * Dashboard Screen - REAL DATA INTEGRATION
 *
 * Data Source: data/opportunities.json (from opportunity_engine.py)
 * NO MOCK DATA - All opportunities are fetched from backend
 *
 * Field Mapping (Turkish keys from backend):
 * - "Ev Sahibi" → Home team
 * - "Deplasman" → Away team
 * - "Lig" → League
 * - "Tarih" → Date
 * - "Saat" → Time
 * - "best_prediction" → AI prediction
 * - "best_confidence" → Confidence score
 * - "predictions" → Alternative predictions
 * - "matched_rules" → Rule IDs
 */

import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

// Opportunity type (matches backend JSON keys)
interface Opportunity {
  'Ev Sahibi': string;
  'Deplasman': string;
  'Lig': string;
  'Tarih': string;
  'Saat': string;
  'best_prediction': string;
  'best_confidence': number;
  'predictions': Array<{
    bet: string;
    confidence: number;
    note: string;
  }>;
  'matched_rules': number[];
  'note'?: string;
  // Detailed view fields
  'alternatif_tahminler'?: Array<{
    tahmin: string;
    güven: number;
    not: string;
    sonuç?: boolean | null;  // Prediction result (true=TUTTU, false=YATTI, null=unknown)
  }>;
  'eşleşen_kurallar'?: Array<{
    kural_id: string;
    kural_adı: string;
  }>;
  'toplam_tahmin_sayısı'?: number;
  // Live score fields
  'live_status'?: string;
  'home_score'?: number | null;
  'away_score'?: number | null;
  'halftime_home'?: number | null;
  'halftime_away'?: number | null;
  'elapsed'?: number | null;
  'is_live'?: boolean;
  'is_finished'?: boolean;
  'prediction_result'?: boolean | null;
}

interface ApiResponse {
  success: boolean;
  opportunities: Opportunity[];
  count?: number;
  message?: string | null;
}

export default function DashboardScreen() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow' | 'day_after_tomorrow'>('today');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [istanbulTime, setIstanbulTime] = useState<string>('');

  // Update Istanbul time every second
  useEffect(() => {
    const updateTime = () => {
      const time = getIstanbulTime();
      const timeString = time.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setIstanbulTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real data from backend
  useEffect(() => {
    let isFirst = true;

    async function fetchOpportunities() {
      try {
        if (isFirst) { setLoading(true); setError(null); }

        const response = await fetch(`/api/opportunities?date=${selectedDate}&t=${Date.now()}`, {
          cache: 'no-store'
        });

        const data: ApiResponse = await response.json();

        if (data.success && data.opportunities.length > 0) {
          setOpportunities(data.opportunities);
          setError(null);
        } else {
          setOpportunities([]);
          setError(data.message || 'Şu anda gösterilecek fırsat maç bulunamadı.');
        }
      } catch (err) {
        console.error('Error fetching opportunities:', err);
        if (isFirst) {
          setError('Veri yüklenirken hata oluştu.');
          setOpportunities([]);
        }
      } finally {
        if (isFirst) { setLoading(false); isFirst = false; }
      }
    }

    // Trigger live score cron, wait for it, then fetch fresh data
    async function triggerAndRefresh() {
      try {
        await fetch('/api/cron/live-scores').catch(() => {});
        // Small delay so Supabase data propagates
        await new Promise(r => setTimeout(r, 500));
      } catch {}
      await fetchOpportunities();
    }

    // Initial: trigger cron first, then load data
    triggerAndRefresh();

    // UI refresh every 20 seconds (reads from Supabase - fast)
    const uiInterval = setInterval(fetchOpportunities, 20000);

    // Live score cron every 90 seconds (calls API-Football + updates Supabase)
    const cronInterval = setInterval(triggerAndRefresh, 90000);

    return () => {
      clearInterval(uiInterval);
      clearInterval(cronInterval);
    };
  }, [selectedDate]);

  // Calculate risk level from confidence
  function getRiskLevel(confidence: number): { label: string; color: string } {
    if (confidence >= 90) {
      return { label: 'DÜŞÜK RİSK', color: 'primary' };
    } else if (confidence >= 85) {
      return { label: 'ORTA RİSK', color: 'aged-gold' };
    } else {
      return { label: 'YÜKSEK RİSK', color: 'red-500' };
    }
  }

  // Calculate gauge circle offset
  function getGaugeOffset(confidence: number): number {
    const circumference = 176; // 2 * π * r (r=28)
    return circumference - (confidence / 100) * circumference;
  }

  // Get confidence color
  function getConfidenceColor(confidence: number): string {
    if (confidence >= 90) return 'text-primary';
    if (confidence >= 85) return 'text-aged-gold';
    return 'text-red-500';
  }

  // Get emoji based on confidence
  function getEmoji(confidence: number): string {
    if (confidence >= 95) return '🤠';
    if (confidence >= 90) return '🎯';
    if (confidence >= 85) return '🔫';
    return '🌵';
  }

  // Get current time in Istanbul timezone (UTC+3)
  function getIstanbulTime(): Date {
    const now = new Date();
    // Get UTC time in milliseconds
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    // Add 3 hours for Istanbul (UTC+3)
    const istanbulTime = new Date(utcTime + 3 * 3600000);
    return istanbulTime;
  }

  // Calculate time until next match (using Istanbul time)
  function getTimeUntilMatch(matchDate: string, matchTime: string): string {
    if (!matchDate || !matchTime) return 'Bilinmiyor';

    try {
      // Parse Turkish date (dd.mm.yyyy) and time (HH:MM)
      const [day, month, year] = matchDate.split('.');
      const [hours, minutes] = matchTime.split(':');

      // Create match datetime (assuming times are in Istanbul timezone)
      const matchDateTime = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );

      // Use Istanbul time for comparison
      const now = getIstanbulTime();
      const diffMs = matchDateTime.getTime() - now.getTime();

      if (diffMs < 0) return 'Başladı';

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours < 1) return `${diffMins} dakika`;
      if (diffHours < 24) return `${diffHours} saat ${diffMins} dk`;

      const diffDays = Math.floor(diffHours / 24);
      const remainingHours = diffHours % 24;
      return `${diffDays} gün ${remainingHours} saat`;
    } catch (e) {
      return 'Bilinmiyor';
    }
  }

  // Get next match (earliest one that hasn't started yet)
  function getNextMatch(): Opportunity | null {
    if (opportunities.length === 0) return null;

    // Filter out matches that have started (live or finished)
    const upcomingMatches = opportunities.filter((opp) => {
      // If match is live or finished, it's not upcoming
      if (opp.is_live || opp.is_finished) return false;

      // Double-check with time calculation
      const timeUntil = getTimeUntilMatch(opp.Tarih, opp.Saat);
      return timeUntil !== 'Başladı';
    });

    // Return the first upcoming match (already sorted by time)
    return upcomingMatches.length > 0 ? upcomingMatches[0] : null;
  }

  // Get match status badge
  function getStatusBadge(opp: Opportunity) {
    if (opp.is_live) {
      return {
        text: 'CANLI',
        color: 'bg-green-500 text-white',
        icon: 'sports_soccer',
      };
    }

    if (opp.is_finished) {
      if (opp.prediction_result === true) {
        return {
          text: '✅ TUTTU',
          color: 'bg-green-500 text-white',
          icon: 'check_circle',
        };
      } else if (opp.prediction_result === false) {
        return {
          text: '❌ YATTI',
          color: 'bg-red-500 text-white',
          icon: 'cancel',
        };
      } else {
        return {
          text: 'BİTTİ',
          color: 'bg-gray-500 text-white',
          icon: 'sports_soccer',
        };
      }
    }

    return null;
  }

  // Get score text (only for live or finished matches)
  function getScoreText(opp: Opportunity): { full: string; halftime?: string } | null {
    // Only show score if match is live or finished
    if (!opp.is_live && !opp.is_finished) {
      return null;
    }

    if (
      opp.home_score !== null &&
      opp.home_score !== undefined &&
      opp.away_score !== null &&
      opp.away_score !== undefined
    ) {
      let fullText = `${opp.home_score}-${opp.away_score}`;
      if (opp.elapsed && opp.is_live) {
        fullText += ` (${opp.elapsed}')`;
      }

      let halftimeText: string | undefined;
      if (
        opp.halftime_home !== null &&
        opp.halftime_home !== undefined &&
        opp.halftime_away !== null &&
        opp.halftime_away !== undefined
      ) {
        halftimeText = `İY: ${opp.halftime_home}-${opp.halftime_away}`;
      }

      return { full: fullText, halftime: halftimeText };
    }
    return null;
  }

  // Calculate daily success rate (finished / total opportunities)
  function getDailySuccessRate() {
    const finished = opportunities.filter((o) => o.is_finished);
    const total = opportunities.length;

    if (finished.length === 0) return { won: 0, finished: 0, total, rate: 0 };

    const won = finished.filter((o) => o.prediction_result === true).length;
    const rate = finished.length > 0 ? (won / finished.length) * 100 : 0;

    return { won, finished: finished.length, total, rate };
  }

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="panel" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText={`İstanbul Saati: ${istanbulTime} | Canlı Veri Motoru Aktif`} />

        <section className="p-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-4xl font-western text-white mb-2 tracking-wide">
                Haftalık Fikstür Havuzu
              </h2>
              <p className="text-slate-400">
                Yapay zeka şeriflerimiz tarafından taranan yüksek olasılıklı düellolar.
              </p>
            </div>
            <div className="flex bg-card-dark p-1 rounded-lg border border-white/5">
              <button
                onClick={() => setSelectedDate('today')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedDate === 'today'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Bugün
              </button>
              <button
                onClick={() => setSelectedDate('tomorrow')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedDate === 'tomorrow'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Yarın
              </button>
              <button
                onClick={() => setSelectedDate('day_after_tomorrow')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedDate === 'day_after_tomorrow'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Öbür Gün
              </button>
            </div>
          </div>

          {/* Stats Cards - Aggregate stats (can be updated later) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <span className="p-3 rounded-xl bg-primary/10 text-primary">
                  <span className="material-icons-round">trending_up</span>
                </span>
                <span className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded uppercase">
                  CANLI
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-bold">
                Fırsat Maç Sayısı
              </p>
              <h3 className="text-3xl font-western text-white">{opportunities.length}</h3>
            </div>

            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 hover:border-aged-gold/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <span className="p-3 rounded-xl bg-aged-gold/10 text-aged-gold">
                  <span className="material-icons-round">analytics</span>
                </span>
                <span className="text-[10px] font-bold text-aged-gold px-2 py-1 bg-aged-gold/10 rounded uppercase">
                  SONUÇLAR
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-bold">
                Bugünün Başarısı
              </p>
              {(() => {
                const success = getDailySuccessRate();
                return success.finished > 0 ? (
                  <div>
                    <h3 className="text-3xl font-western text-white mb-1">
                      {success.finished} / {success.total}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {success.won}/{success.finished} Tuttu · %{success.rate.toFixed(0)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-3xl font-western text-white mb-1">
                      0 / {success.total}
                    </h3>
                    <p className="text-xs text-slate-400">Henüz maç bitmedi</p>
                  </div>
                );
              })()}
            </div>

            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 hover:border-saddle-brown/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <span className="p-3 rounded-xl bg-saddle-brown/10 text-saddle-brown">
                  <span className="material-icons-round">schedule</span>
                </span>
                <span className="text-[10px] font-bold text-saddle-brown px-2 py-1 bg-saddle-brown/10 rounded uppercase">
                  YAKLAŞAN
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-bold">
                Sıradaki Maç
              </p>
              {getNextMatch() ? (
                <div>
                  <h3 className="text-2xl font-western text-white mb-1">
                    {getTimeUntilMatch(getNextMatch()!.Tarih, getNextMatch()!.Saat)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {getNextMatch()!['Ev Sahibi']} vs {getNextMatch()!.Deplasman}
                  </p>
                </div>
              ) : (
                <h3 className="text-2xl font-western text-white">-</h3>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-slate-400">Fırsat maçlar yükleniyor...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center max-w-md">
                <span className="text-6xl mb-4 block">🌵</span>
                <h3 className="text-2xl font-western text-white mb-2">Fırsat Yok</h3>
                <p className="text-slate-400">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-6 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold"
                >
                  Yeniden Dene
                </button>
              </div>
            </div>
          )}

          {/* Match Cards - REAL DATA ONLY */}
          {!loading && !error && opportunities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {opportunities.map((opp, index) => {
                const risk = getRiskLevel(opp.best_confidence);
                const gaugeOffset = getGaugeOffset(opp.best_confidence);
                const confidenceColor = getConfidenceColor(opp.best_confidence);
                const emoji = getEmoji(opp.best_confidence);

                return (
                  <div
                    key={index}
                    className={`bg-card-dark p-5 rounded-2xl border ${
                      opp.best_confidence >= 95
                        ? 'border-aged-gold/30'
                        : 'border-white/5'
                    } relative overflow-hidden group hover:scale-[1.02] transition-transform`}
                  >
                    {/* Emoji */}
                    <div
                      className={`absolute top-0 right-0 p-3 ${
                        opp.best_confidence >= 95
                          ? 'opacity-100'
                          : 'opacity-20 group-hover:opacity-100'
                      } transition-opacity`}
                    >
                      <span className="text-4xl">{emoji}</span>
                    </div>

                    {/* League & Status Badges */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span className="text-[10px] px-2 py-1 bg-white/5 text-slate-400 rounded-md font-bold uppercase tracking-wider">
                        {opp.Lig}
                      </span>
                      {(() => {
                        const statusBadge = getStatusBadge(opp);
                        return statusBadge ? (
                          <span
                            className={`text-[10px] px-2 py-1 ${statusBadge.color} rounded-md font-bold uppercase tracking-wider animate-pulse`}
                          >
                            {statusBadge.text}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Match Teams */}
                    <h4 className="text-lg font-bold text-white mb-1">
                      {opp['Ev Sahibi']} - {opp.Deplasman}
                    </h4>

                    {/* Live Score */}
                    {(() => {
                      const scoreData = getScoreText(opp);
                      return scoreData ? (
                        <div className="mb-2">
                          <p className="text-aged-gold text-xl font-bold">
                            {scoreData.full}
                          </p>
                          {scoreData.halftime && (
                            <p className="text-slate-400 text-sm mt-1">
                              {scoreData.halftime}
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {/* AI Prediction */}
                    <p className="text-primary text-sm font-bold mb-4 neon-glow">
                      AI TAHMİN: {opp.best_prediction}
                    </p>

                    {/* Confidence Gauge */}
                    <div className="flex items-center gap-6 mb-4">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            className="text-white/5"
                            cx="32"
                            cy="32"
                            fill="transparent"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <circle
                            className={`${confidenceColor} gauge-circle`}
                            cx="32"
                            cy="32"
                            fill="transparent"
                            r="28"
                            stroke="currentColor"
                            strokeDasharray="176"
                            strokeDashoffset={gaugeOffset}
                            strokeWidth="4"
                          />
                        </svg>
                        <span className="absolute text-xs font-bold">
                          {opp.best_confidence}%
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Güven Puanı
                        </p>
                        <p className="text-xs text-slate-400 italic">
                          {opp.matched_rules.length} kural eşleşti
                        </p>
                      </div>
                    </div>

                    {/* Match Date & Time */}
                    <div className="text-xs text-slate-500 mb-3">
                      <span className="material-icons-round text-xs align-middle mr-1">
                        schedule
                      </span>
                      {opp.Tarih} • {opp.Saat}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => setSelectedOpportunity(opp)}
                      className={`w-full py-2 ${
                        opp.best_confidence >= 90
                          ? 'bg-primary hover:bg-primary/90'
                          : opp.best_confidence >= 85
                          ? 'bg-aged-gold hover:bg-aged-gold/90 text-black'
                          : 'bg-saddle-brown hover:bg-saddle-brown/90'
                      } text-white text-xs font-bold rounded-lg tracking-widest uppercase transition-all`}
                    >
                      DETAYLARI GÖR
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <MobileNav activeTab="panel" />

      {/* Details Modal */}
      {selectedOpportunity && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedOpportunity(null)}
        >
          <div
            className="bg-card-dark rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-card-dark border-b border-white/10 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-western text-white mb-2">
                    {selectedOpportunity['Ev Sahibi']} vs {selectedOpportunity.Deplasman}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-white/5 text-slate-400 rounded-md font-bold uppercase">
                      {selectedOpportunity.Lig}
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedOpportunity.Tarih} • {selectedOpportunity.Saat}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOpportunity(null)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <span className="material-icons-round text-slate-400">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Main Prediction */}
              <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">
                  Ana Tahmin
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-western text-primary">
                    {selectedOpportunity.best_prediction}
                  </p>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">
                      {selectedOpportunity.best_confidence}%
                    </p>
                    <p className="text-xs text-slate-400">Güven</p>
                  </div>
                </div>
              </div>

              {/* Alternative Predictions */}
              {selectedOpportunity.alternatif_tahminler &&
                selectedOpportunity.alternatif_tahminler.length > 0 && (
                  <div>
                    <h4 className="text-lg font-western text-white mb-3 flex items-center gap-2">
                      <span className="material-icons-round text-aged-gold">auto_awesome</span>
                      Alternatif Tahminler
                    </h4>
                    <div className="space-y-2">
                      {selectedOpportunity.alternatif_tahminler.map((alt, index) => (
                        <div
                          key={index}
                          className={`bg-white/5 p-3 rounded-lg border transition-all ${
                            alt.sonuç === true
                              ? 'border-green-500/30 bg-green-500/5'
                              : alt.sonuç === false
                              ? 'border-red-500/30 bg-red-500/5'
                              : 'border-white/5 hover:border-aged-gold/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-bold">{alt.tahmin}</p>
                                {/* Result badge for finished matches */}
                                {selectedOpportunity.is_finished && alt.sonuç !== undefined && alt.sonuç !== null && (
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                      alt.sonuç
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }`}
                                  >
                                    {alt.sonuç ? '✓ TUTTU' : '✗ YATTI'}
                                  </span>
                                )}
                              </div>
                              {alt.not && (
                                <p className="text-xs text-slate-400 mt-1">{alt.not}</p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold text-aged-gold">{alt.güven}%</p>
                              <p className="text-xs text-slate-500">Güven</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Matched Rules */}
              {selectedOpportunity.eşleşen_kurallar &&
                selectedOpportunity.eşleşen_kurallar.length > 0 && (
                  <div>
                    <h4 className="text-lg font-western text-white mb-3 flex items-center gap-2">
                      <span className="material-icons-round text-saddle-brown">rule</span>
                      Eşleşen Kurallar
                    </h4>
                    <div className="space-y-2">
                      {selectedOpportunity.eşleşen_kurallar.map((rule, index) => (
                        <div
                          key={index}
                          className="bg-white/5 p-3 rounded-lg border border-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-saddle-brown/20 text-saddle-brown rounded font-bold">
                              #{rule.kural_id}
                            </span>
                            <p className="text-white text-sm">{rule.kural_adı}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      Toplam {selectedOpportunity.toplam_tahmin_sayısı || 0} tahmin bulundu
                    </p>
                  </div>
                )}

              {/* Note */}
              {selectedOpportunity.note && (
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-2">
                    Not
                  </p>
                  <p className="text-sm text-slate-300">{selectedOpportunity.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
