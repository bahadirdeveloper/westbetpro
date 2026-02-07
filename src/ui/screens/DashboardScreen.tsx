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
import WesternScoreboard from '../components/WesternScoreboard';

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
  const [selectedDate, setSelectedDate] = useState<'yesterday' | 'today' | 'tomorrow' | 'day_after_tomorrow'>('today');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [istanbulTime, setIstanbulTime] = useState<string>('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedOpportunity) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedOpportunity]);

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
    let isMounted = true;

    async function fetchOpportunities() {
      try {
        if (isFirst) { setLoading(true); setError(null); }

        const response = await fetch(`/api/opportunities?date=${selectedDate}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store' }
        });

        if (!isMounted) return;

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
        if (isFirst && isMounted) {
          setError('Veri yüklenirken hata oluştu.');
          setOpportunities([]);
        }
      } finally {
        if (isFirst) { setLoading(false); isFirst = false; }
      }
    }

    // For "today" we poll Supabase for fresh data; cron runs server-side via Vercel
    const isToday = selectedDate === 'today';

    if (isToday) {
      fetchOpportunities();

      // Poll Supabase every 15 seconds for fresh data (no API-Football cost)
      const uiInterval = setInterval(() => {
        if (isMounted) fetchOpportunities();
      }, 15000);

      return () => {
        isMounted = false;
        clearInterval(uiInterval);
      };
    } else {
      // For yesterday/tomorrow/day_after_tomorrow: just fetch once, no polling
      fetchOpportunities();
      return () => { isMounted = false; };
    }
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

  // Get all predictions for a match (best + alternatives, deduplicated)
  function getAllPredictions(opp: Opportunity): Array<{tahmin: string; güven: number; not: string; sonuç?: boolean | null; isBest: boolean}> {
    const all: Array<{tahmin: string; güven: number; not: string; sonuç?: boolean | null; isBest: boolean}> = [];
    const seen = new Set<string>();

    // Add best prediction first
    const bestNorm = (opp.best_prediction || '').trim();
    seen.add(bestNorm);

    all.push({
      tahmin: opp.best_prediction,
      güven: opp.best_confidence,
      not: opp.note || '',
      sonuç: opp.prediction_result,
      isBest: true
    });

    // Add alternatives from alternatif_tahminler
    if (opp.alternatif_tahminler && opp.alternatif_tahminler.length > 0) {
      opp.alternatif_tahminler.forEach(alt => {
        const altNorm = (alt.tahmin || '').trim();
        if (!altNorm || seen.has(altNorm)) return;
        seen.add(altNorm);
        all.push({
          tahmin: alt.tahmin,
          güven: alt.güven,
          not: alt.not || '',
          sonuç: alt.sonuç,
          isBest: false
        });
      });
    } else if (opp.predictions && opp.predictions.length > 0) {
      // Fallback to predictions array
      opp.predictions.forEach(pred => {
        const predNorm = (pred.bet || '').trim();
        if (!predNorm || seen.has(predNorm)) return;
        seen.add(predNorm);
        all.push({
          tahmin: pred.bet,
          güven: pred.confidence,
          not: pred.note || '',
          sonuç: undefined,
          isBest: false
        });
      });
    }

    return all;
  }

  // Get badge rank based on confidence
  function getBadgeRank(confidence: number): { icon: string; label: string; color: string } | null {
    if (confidence >= 95) return { icon: 'local_police', label: 'BASKOMISER', color: 'text-aged-gold' };
    if (confidence >= 92) return { icon: 'shield', label: 'SERIF', color: 'text-primary' };
    if (confidence >= 90) return { icon: 'verified_user', label: 'YARDIMCI', color: 'text-primary/70' };
    return null;
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

  // Get next match (earliest one that hasn't started yet, or next live match)
  function getNextMatch(): { match: Opportunity; label: string } | null {
    if (opportunities.length === 0) return null;

    // Priority 1: Find live matches
    const liveMatches = opportunities.filter((opp) => opp.is_live);
    if (liveMatches.length > 0) {
      return {
        match: liveMatches[0],
        label: `${liveMatches[0].elapsed || '?'}' oynanıyor`
      };
    }

    // Priority 2: Find not-started matches
    const notStarted = opportunities.filter((opp) => !opp.is_live && !opp.is_finished);
    if (notStarted.length > 0) {
      const timeUntil = getTimeUntilMatch(notStarted[0].Tarih, notStarted[0].Saat);
      return {
        match: notStarted[0],
        label: timeUntil === 'Başladı' ? 'Başlamak üzere' : timeUntil
      };
    }

    // Priority 3: All finished
    const finished = opportunities.filter((opp) => opp.is_finished);
    if (finished.length === opportunities.length) {
      return null; // All done
    }

    return null;
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

  // Calculate total prediction count across all matches
  function getTotalPredictionCount(): number {
    return opportunities.reduce((sum, opp) => {
      return sum + getAllPredictions(opp).length;
    }, 0);
  }

  // Calculate daily success rate (finished / total opportunities)
  function getDailySuccessRate() {
    const finished = opportunities.filter((o) => o.is_finished);
    const total = opportunities.length;

    if (finished.length === 0) return { won: 0, finished: 0, total, rate: 0, totalPreds: getTotalPredictionCount(), totalPredWon: 0, totalPredFinished: 0 };

    const won = finished.filter((o) => o.prediction_result === true).length;
    const rate = finished.length > 0 ? (won / finished.length) * 100 : 0;

    // Count all predictions that were correct across finished matches
    let totalPredWon = 0;
    let totalPredFinished = 0;
    finished.forEach(opp => {
      const preds = getAllPredictions(opp);
      preds.forEach(p => {
        if (p.sonuç === true) totalPredWon++;
        if (p.sonuç === true || p.sonuç === false) totalPredFinished++;
      });
    });

    return { won, finished: finished.length, total, rate, totalPreds: getTotalPredictionCount(), totalPredWon, totalPredFinished };
  }

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="panel" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText={`İstanbul Saati: ${istanbulTime} | Canlı Veri Motoru Aktif`} />

        <section className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-western text-white mb-1 sm:mb-2 tracking-wide">
                Haftalik Fikstur Havuzu
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">
                Yapay zeka seriflerimiz tarafindan taranan yuksek olasilikli duellolar.
              </p>
            </div>
            <div className="flex bg-card-dark p-1 rounded-lg border border-white/5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedDate('yesterday')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  selectedDate === 'yesterday'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Dun
              </button>
              <button
                onClick={() => setSelectedDate('today')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  selectedDate === 'today'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Bugun
              </button>
              <button
                onClick={() => setSelectedDate('tomorrow')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  selectedDate === 'tomorrow'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Yarin
              </button>
              <button
                onClick={() => setSelectedDate('day_after_tomorrow')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  selectedDate === 'day_after_tomorrow'
                    ? 'bg-white/10 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Obur Gun
              </button>
            </div>
          </div>

          {/* Western Saloon Scoreboards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-10">
            <WesternScoreboard
              title="Firsat Mac Sayisi"
              value={opportunities.length}
              subtitle={`Toplam ${getTotalPredictionCount()} tahmin`}
              accentColor="primary"
              icon="trending_up"
              badge="CANLI"
            />

            {(() => {
              const success = getDailySuccessRate();
              const dateLabel = selectedDate === 'yesterday' ? 'Dunun Basarisi' : selectedDate === 'today' ? 'Bugunun Basarisi' : 'Basari Durumu';
              if (success.finished > 0) {
                return (
                  <WesternScoreboard
                    title={dateLabel}
                    value={`${success.won}/${success.finished} Mac`}
                    subtitle={`%${success.rate.toFixed(0)} basari`}
                    secondLine={success.totalPredFinished > 0 ? `${success.totalPredWon}/${success.totalPredFinished} tahmin tuttu` : undefined}
                    accentColor="aged-gold"
                    icon="analytics"
                    badge="SONUCLAR"
                  />
                );
              }
              return (
                <WesternScoreboard
                  title={dateLabel}
                  value="—"
                  subtitle="Henuz sonuclanan mac yok"
                  secondLine={`${success.total} mac · ${success.totalPreds} tahmin bekleniyor`}
                  accentColor="aged-gold"
                  icon="analytics"
                  badge="SONUCLAR"
                />
              );
            })()}

            {(() => {
              const next = getNextMatch();
              if (next) {
                return (
                  <WesternScoreboard
                    title="Siradaki Mac"
                    value={next.label}
                    subtitle={`${next.match['Ev Sahibi']} vs ${next.match.Deplasman}`}
                    accentColor="saddle-brown"
                    icon="schedule"
                    badge="YAKLASAN"
                  />
                );
              }
              const allFinished = opportunities.length > 0 && opportunities.every(o => o.is_finished);
              return (
                <WesternScoreboard
                  title="Siradaki Mac"
                  value={allFinished ? 'Tamamlandi' : '—'}
                  subtitle={allFinished ? 'Tum maclar bitti' : undefined}
                  accentColor="saddle-brown"
                  icon="schedule"
                  badge="YAKLASAN"
                />
              );
            })()}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
              {opportunities.map((opp, index) => {
                const allPreds = getAllPredictions(opp);
                const totalPredCount = allPreds.length;
                const badge = getBadgeRank(opp.best_confidence);
                const confidenceColor = getConfidenceColor(opp.best_confidence);

                return (
                  <div
                    key={index}
                    className={`bg-card-dark p-4 sm:p-5 rounded-2xl border ${
                      opp.best_confidence >= 95
                        ? 'border-aged-gold/30'
                        : 'border-white/5'
                    } relative overflow-hidden group hover:scale-[1.01] sm:hover:scale-[1.02] transition-transform`}
                  >
                    {/* Sheriff Badge (top right) */}
                    {badge && (
                      <div className={`absolute top-3 right-3 flex flex-col items-center ${badge.color}`}>
                        <span className="material-icons-round text-3xl sm:text-4xl drop-shadow-lg">{badge.icon}</span>
                        <span className="text-[8px] font-bold tracking-wider mt-0.5 opacity-80">{badge.label}</span>
                      </div>
                    )}

                    {/* League & Status Badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap pr-12">
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
                    <h4 className="text-base sm:text-lg font-bold text-white mb-1 pr-10">
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

                    {/* Prediction Count Badge + Results Summary */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${confidenceColor} bg-white/5`}>
                        {totalPredCount} TAHMiN
                      </span>
                      {(() => {
                        if (!opp.is_finished) return (
                          <span className="text-[10px] text-slate-500">
                            {opp.matched_rules?.length || 0} kural eslesti
                          </span>
                        );
                        const won = allPreds.filter(p => p.sonuç === true).length;
                        const evaluated = allPreds.filter(p => p.sonuç === true || p.sonuç === false).length;
                        if (evaluated === 0) return (
                          <span className="text-[10px] text-slate-500">sonuc hesaplaniyor...</span>
                        );
                        const allWon = won === evaluated;
                        return (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${allWon ? 'text-green-400 bg-green-500/10' : 'text-aged-gold bg-aged-gold/10'}`}>
                            {won}/{evaluated} TUTTU
                          </span>
                        );
                      })()}
                    </div>

                    {/* ALL Predictions List */}
                    <div className="space-y-1.5 mb-3">
                      {allPreds.map((pred, pIdx) => {
                        const predColor = getConfidenceColor(pred.güven);
                        const isFinished = opp.is_finished;

                        return (
                          <div
                            key={pIdx}
                            className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-sm ${
                              pred.isBest
                                ? 'bg-primary/10 border border-primary/20'
                                : 'bg-white/5 border border-white/5'
                            } ${
                              isFinished && pred.sonuç === true
                                ? '!border-green-500/30 !bg-green-500/5'
                                : isFinished && pred.sonuç === false
                                ? '!border-red-500/30 !bg-red-500/5'
                                : ''
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {pred.isBest && (
                                <span className="material-icons-round text-primary text-sm flex-shrink-0">star</span>
                              )}
                              <span className={`font-bold truncate ${pred.isBest ? 'text-white' : 'text-slate-300'}`}>
                                {pred.tahmin}
                              </span>
                              {/* Result indicator for finished matches */}
                              {isFinished && pred.sonuç === true && (
                                <span className="text-green-400 text-xs flex-shrink-0">✓</span>
                              )}
                              {isFinished && pred.sonuç === false && (
                                <span className="text-red-400 text-xs flex-shrink-0">✗</span>
                              )}
                            </div>
                            <span className={`text-xs font-bold ${predColor} flex-shrink-0`}>
                              %{pred.güven}
                            </span>
                          </div>
                        );
                      })}
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
                      DETAYLARI GOR
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setSelectedOpportunity(null)}
        >
          <div
            className="bg-card-dark rounded-t-2xl sm:rounded-2xl border border-white/10 w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-card-dark border-b border-white/10 p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl font-western text-white mb-2 truncate">
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
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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
