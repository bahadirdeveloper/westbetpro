'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

interface AlertState {
  predictionType: string;
  goalsNeeded: number;
  currentScore: { home: number; away: number };
  targetDescription: string;
  isFirstHalf: boolean;
  minutesElapsed: number;
  alertLevel: 'hot' | 'warm' | 'cold';
  message: string;
  isAlreadyHit: boolean;
}

interface LiveAlert {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchTime: string;
  currentScore: string;
  elapsed: number;
  prediction: string;
  confidence: number;
  alertState: AlertState | null;
  alternativeAlerts: Array<{
    prediction: string;
    confidence: number;
    alertState: AlertState | null;
  }>;
  isFinished: boolean;
  isLive: boolean;
  isUpcoming: boolean;
  predictionResult: boolean | null;
  note?: string;
  matchedRules?: number[];
}

interface Stats {
  hot: number;
  warm: number;
  live: number;
  upcoming: number;
  finished: number;
  total: number;
  won: number;
  lost: number;
}

export default function LiveAnalysisScreen() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [stats, setStats] = useState<Stats>({ hot: 0, warm: 0, live: 0, upcoming: 0, finished: 0, total: 0, won: 0, lost: 0 });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<LiveAlert | null>(null);
  const [showFinished, setShowFinished] = useState(false);
  const prevHotIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedMatch) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedMatch]);

  // Notification sound
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVghoq+sZJjQDZcgoO4sZNlQTlbgYC2sZVoQzxagX+0sZdqRT1Zf320sZlsRz5YfXu0sZttSD9XfHqzsZxvSkBWe3mysZ1wS0FVenexsZ5xTEJUeXWwsZ9yTUNTeHSvsaByTkRSeHOusaFzT0VReXKtsaJ0UEZQeXGssaN1UUdPeXCrsaR2UkhOeW+qsaV3U0lNeW6psaZ4VEpMe22osad5VUtLe2ynsah6VkxKfGumsam7');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      // Vibrate on mobile
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }, [soundEnabled]);

  useEffect(() => {
    let isMounted = true;
    let isFirst = true;

    async function fetchAlerts() {
      try {
        if (isFirst) setLoading(true);
        const res = await fetch(`/api/live-alerts?t=${Date.now()}`, { cache: 'no-store' });
        if (!isMounted) return;
        if (!res.ok) throw new Error(`API hatasi: ${res.status}`);
        const data = await res.json();
        if (data.success) {
          setAlerts(data.alerts || []);
          setStats(data.stats || { hot: 0, warm: 0, live: 0, upcoming: 0, finished: 0, total: 0, won: 0, lost: 0 });

          // Check for NEW hot alerts
          const newHotIds = new Set<string>();
          (data.alerts || []).forEach((a: LiveAlert) => {
            if (a.isLive && a.alertState?.alertLevel === 'hot') {
              newHotIds.add(a.id);
              if (!prevHotIds.current.has(a.id)) {
                playAlertSound();
              }
            }
          });
          prevHotIds.current = newHotIds;

          const now = new Date();
          const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
          const istanbul = new Date(utcTime + 3 * 3600000);
          setLastUpdate(istanbul.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (e) {
        console.error('Alert fetch error:', e);
      } finally {
        if (isFirst) { setLoading(false); isFirst = false; }
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [playAlertSound]);

  const hotAlerts = alerts.filter(a => a.isLive && a.alertState?.alertLevel === 'hot');
  const warmAlerts = alerts.filter(a => a.isLive && a.alertState?.alertLevel === 'warm');
  const liveMatches = alerts.filter(a => a.isLive && (!a.alertState || a.alertState.alertLevel === 'cold'));
  const upcomingMatches = alerts.filter(a => a.isUpcoming);
  const finishedMatches = alerts.filter(a => a.isFinished);

  function getAlertCardClass(level: string | undefined, isLive: boolean): string {
    if (!isLive) return 'border border-white/5';
    if (level === 'hot') return 'alert-hot alert-enter';
    if (level === 'warm') return 'alert-warm alert-enter';
    return 'border border-white/5';
  }

  // Countdown for upcoming matches
  function getCountdown(matchTime: string): string {
    if (!matchTime) return '';
    try {
      const now = new Date();
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const istanbul = new Date(utcTime + 3 * 3600000);

      const [h, m] = matchTime.split(':').map(Number);
      const matchDate = new Date(istanbul);
      matchDate.setHours(h, m, 0, 0);

      const diffMs = matchDate.getTime() - istanbul.getTime();
      if (diffMs <= 0) return 'Baslamak uzere';

      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);

      if (hours === 0) return `${mins} dk`;
      return `${hours} sa ${mins} dk`;
    } catch {
      return matchTime;
    }
  }

  function renderAlertCard(alert: LiveAlert, showAlternatives: boolean = true) {
    const level = alert.alertState?.alertLevel;

    return (
      <div
        key={alert.id}
        onClick={() => setSelectedMatch(alert)}
        className={`bg-card-dark rounded-2xl p-4 sm:p-5 relative overflow-hidden cursor-pointer ${getAlertCardClass(level, alert.isLive)} transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20`}
      >
        {/* Alert Level Badge */}
        {level === 'hot' && alert.isLive && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">SICAK</span>
          </div>
        )}
        {level === 'warm' && alert.isLive && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold text-aged-gold uppercase tracking-wider px-2 py-1 bg-aged-gold/10 rounded">YAKIN</span>
          </div>
        )}
        {alert.isUpcoming && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider px-2 py-1 bg-blue-400/10 rounded">{getCountdown(alert.matchTime)}</span>
          </div>
        )}
        {alert.isFinished && (
          <div className="absolute top-3 right-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
              alert.predictionResult === true ? 'text-green-400 bg-green-500/10' :
              alert.predictionResult === false ? 'text-red-400 bg-red-500/10' :
              'text-slate-400 bg-white/5'
            }`}>
              {alert.predictionResult === true ? 'TUTTU' : alert.predictionResult === false ? 'YATTI' : 'BITTI'}
            </span>
          </div>
        )}

        {/* League */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2 py-1 bg-white/5 text-slate-400 rounded-md font-bold uppercase tracking-wider">
            {alert.league}
          </span>
          {alert.isLive && (
            <span className="text-[10px] px-2 py-1 bg-green-500/20 text-green-400 rounded-md font-bold animate-pulse">
              CANLI
            </span>
          )}
        </div>

        {/* Teams & Score */}
        <div className="mt-2 mb-2">
          <h4 className="text-base sm:text-lg font-bold text-white pr-16">
            {alert.homeTeam} - {alert.awayTeam}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            {alert.isLive || alert.isFinished ? (
              <>
                <span className="text-aged-gold text-2xl font-bold">{alert.currentScore}</span>
                {alert.isLive && alert.elapsed > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded font-bold">
                      {alert.elapsed}&apos;
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {alert.elapsed <= 45 ? `${45 - alert.elapsed} dk kaldi (IY)` : alert.elapsed <= 90 ? `${90 - alert.elapsed} dk kaldi` : 'Uzatma'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-slate-400 text-lg font-bold">{alert.matchTime}</span>
            )}
          </div>
        </div>

        {/* Main Prediction Alert */}
        <div className={`rounded-lg p-3 mb-2 ${
          alert.alertState?.isAlreadyHit ? 'bg-primary/10 border border-primary/20' :
          level === 'hot' ? 'bg-primary/5 border border-primary/10' :
          level === 'warm' ? 'bg-aged-gold/5 border border-aged-gold/10' :
          'bg-white/5 border border-white/5'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="material-icons-round text-primary text-sm flex-shrink-0">star</span>
              <span className="font-bold text-white truncate">{alert.prediction}</span>
              <span className="text-xs font-bold text-primary flex-shrink-0">%{alert.confidence}</span>
            </div>
            {alert.alertState && alert.isLive && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                level === 'hot' ? 'text-primary bg-primary/10' :
                level === 'warm' ? 'text-aged-gold bg-aged-gold/10' :
                'text-slate-400 bg-white/5'
              }`}>
                {alert.alertState.message}
              </span>
            )}
            {alert.isFinished && alert.predictionResult !== null && (
              <span className={`text-xs font-bold ${alert.predictionResult ? 'text-green-400' : 'text-red-400'}`}>
                {alert.predictionResult ? '✓' : '✗'}
              </span>
            )}
          </div>
          {alert.alertState && alert.isLive && alert.alertState.targetDescription && (
            <p className="text-xs text-slate-400 mt-1 ml-7">{alert.alertState.targetDescription}</p>
          )}
        </div>

        {/* Alternative Prediction Alerts */}
        {showAlternatives && alert.alternativeAlerts.length > 0 && (
          <div className="space-y-1">
            {alert.alternativeAlerts.map((alt, idx) => {
              const altLevel = alt.alertState?.alertLevel;
              return (
                <div key={idx} className={`rounded-lg px-3 py-2 flex items-center justify-between gap-2 ${
                  alt.alertState?.isAlreadyHit ? 'bg-primary/5 border border-primary/10' :
                  altLevel === 'hot' ? 'bg-primary/5 border border-primary/10' :
                  altLevel === 'warm' ? 'bg-aged-gold/5 border border-aged-gold/10' :
                  'bg-white/5 border border-white/5'
                }`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-bold text-slate-300 text-sm truncate">{alt.prediction}</span>
                    <span className="text-xs font-bold text-aged-gold flex-shrink-0">%{alt.confidence}</span>
                  </div>
                  {alt.alertState && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                      altLevel === 'hot' ? 'text-primary bg-primary/10' :
                      altLevel === 'warm' ? 'text-aged-gold bg-aged-gold/10' :
                      'text-slate-500 bg-white/5'
                    }`}>
                      {alt.alertState.message}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tap hint */}
        <div className="mt-2 text-center">
          <span className="text-[10px] text-slate-600">Detay icin tikla</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="canli-analiz" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText={`Canli Av Sahasi | ${lastUpdate ? `Son: ${lastUpdate}` : 'Yukleniyor...'}`} />

        <section className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-western text-white mb-2 tracking-wide uppercase">
                Canli Av Sahasi
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">
                Tahminlerimize yakin canli maclar — otomatik alarm sistemi aktif
              </p>
            </div>

            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all self-start sm:self-auto ${
                soundEnabled
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-white/5 text-slate-400 border border-white/5'
              }`}
            >
              <span className="material-icons-round text-sm">{soundEnabled ? 'volume_up' : 'volume_off'}</span>
              {soundEnabled ? 'Ses Acik' : 'Ses Kapali'}
            </button>
          </div>

          {/* Stats Bar */}
          {!loading && stats.total > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
              {stats.hot > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{stats.hot}</p>
                  <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Sicak Alarm</p>
                </div>
              )}
              {stats.warm > 0 && (
                <div className="bg-aged-gold/10 border border-aged-gold/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-aged-gold">{stats.warm}</p>
                  <p className="text-[10px] font-bold text-aged-gold/70 uppercase tracking-wider">Yakin Takip</p>
                </div>
              )}
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.live}</p>
                <p className="text-[10px] font-bold text-green-400/70 uppercase tracking-wider">Canli</p>
              </div>
              <div className="bg-blue-400/10 border border-blue-400/20 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.upcoming}</p>
                <p className="text-[10px] font-bold text-blue-400/70 uppercase tracking-wider">Yaklasan</p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-slate-300">{stats.finished}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Biten</p>
              </div>
              {stats.finished > 0 && (
                <div className={`border rounded-xl p-3 text-center ${
                  stats.won > stats.lost ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                }`}>
                  <p className="text-2xl font-bold">
                    <span className="text-green-400">{stats.won}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-red-400">{stats.lost}</span>
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {stats.finished > 0 ? `%${Math.round((stats.won / stats.finished) * 100)} basari` : 'Tuttu/Yatti'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress bar */}
          {!loading && stats.total > 0 && (
            <div className="mb-8">
              <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                {stats.won > 0 && (
                  <div className="bg-green-500 transition-all" style={{ width: `${(stats.won / stats.total) * 100}%` }} />
                )}
                {stats.lost > 0 && (
                  <div className="bg-red-500 transition-all" style={{ width: `${(stats.lost / stats.total) * 100}%` }} />
                )}
                {stats.live > 0 && (
                  <div className="bg-primary animate-pulse transition-all" style={{ width: `${(stats.live / stats.total) * 100}%` }} />
                )}
                {stats.upcoming > 0 && (
                  <div className="bg-blue-400/50 transition-all" style={{ width: `${(stats.upcoming / stats.total) * 100}%` }} />
                )}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-500">0</span>
                <span className="text-[10px] text-slate-500">{stats.total} mac</span>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <p className="text-slate-400">Canli maclar taraniyor...</p>
              </div>
            </div>
          )}

          {/* No live data */}
          {!loading && alerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-24">
              <div className="wood-texture saloon-border rounded-2xl p-6 sm:p-12 text-center max-w-lg relative overflow-hidden">
                <span className="text-6xl mb-4 block">🌵</span>
                <h3 className="font-western text-2xl text-aged-gold mb-4">RADAR BOS</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Su anda canli mac yok veya tahminlerimize uyan aktif mac bulunamadi.
                  Maclar basladiginda burada canli alarm sistemi devreye girecek.
                </p>
                <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-aged-gold/20 to-transparent" />
              </div>
            </div>
          )}

          {/* Hot Alerts */}
          {!loading && hotAlerts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                <h3 className="text-lg font-western text-primary uppercase tracking-wider">
                  Sicak Alarmlar
                </h3>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {hotAlerts.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {hotAlerts.map(alert => renderAlertCard(alert))}
              </div>
            </div>
          )}

          {/* Warm Alerts */}
          {!loading && warmAlerts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-icons-round text-aged-gold text-lg">visibility</span>
                <h3 className="text-lg font-western text-aged-gold uppercase tracking-wider">
                  Yakin Takip
                </h3>
                <span className="text-xs font-bold text-aged-gold bg-aged-gold/10 px-2 py-0.5 rounded">
                  {warmAlerts.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {warmAlerts.map(alert => renderAlertCard(alert))}
              </div>
            </div>
          )}

          {/* Other Live Matches */}
          {!loading && liveMatches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-icons-round text-green-400 text-lg">sports_soccer</span>
                <h3 className="text-lg font-western text-green-400 uppercase tracking-wider">
                  Canli Maclar
                </h3>
                <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                  {liveMatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {liveMatches.map(alert => renderAlertCard(alert, false))}
              </div>
            </div>
          )}

          {/* Upcoming Matches */}
          {!loading && upcomingMatches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-icons-round text-blue-400 text-lg">schedule</span>
                <h3 className="text-lg font-western text-blue-400 uppercase tracking-wider">
                  Yaklasan Maclar
                </h3>
                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                  {upcomingMatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcomingMatches.map(alert => renderAlertCard(alert, true))}
              </div>
            </div>
          )}

          {/* Finished Matches (collapsible) */}
          {!loading && finishedMatches.length > 0 && (
            <div className="mb-8">
              <button
                onClick={() => setShowFinished(!showFinished)}
                className="flex items-center gap-2 mb-4 group"
              >
                <span className="material-icons-round text-slate-500 text-lg">check_circle</span>
                <h3 className="text-lg font-western text-slate-500 uppercase tracking-wider">
                  Tamamlanan
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                  {finishedMatches.length}
                </span>
                <span className="material-icons-round text-slate-500 text-sm transition-transform group-hover:text-slate-300" style={{ transform: showFinished ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  expand_more
                </span>
                {stats.won > 0 && (
                  <span className="text-xs text-green-400 font-bold">{stats.won} tuttu</span>
                )}
              </button>
              {showFinished && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
                  {finishedMatches.map(alert => renderAlertCard(alert))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <MobileNav activeTab="canli-analiz" />

      {/* Match Detail Modal - Portal to body */}
      {selectedMatch && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setSelectedMatch(null)}
        >
          <div
            className="bg-card-dark rounded-t-2xl sm:rounded-2xl border border-white/10 w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-card-dark border-b border-white/10 p-4 sm:p-6 z-10">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] px-2 py-1 bg-white/5 text-slate-400 rounded-md font-bold uppercase">{selectedMatch.league}</span>
                    {selectedMatch.isLive && (
                      <span className="text-[10px] px-2 py-1 bg-green-500/20 text-green-400 rounded-md font-bold animate-pulse">CANLI</span>
                    )}
                    {selectedMatch.isUpcoming && (
                      <span className="text-[10px] px-2 py-1 bg-blue-400/10 text-blue-400 rounded-md font-bold">{getCountdown(selectedMatch.matchTime)}</span>
                    )}
                    {selectedMatch.isFinished && (
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                        selectedMatch.predictionResult === true ? 'bg-green-500/20 text-green-400' :
                        selectedMatch.predictionResult === false ? 'bg-red-500/20 text-red-400' :
                        'bg-white/5 text-slate-400'
                      }`}>
                        {selectedMatch.predictionResult === true ? 'TUTTU' : selectedMatch.predictionResult === false ? 'YATTI' : 'BITTI'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-western text-white truncate">
                    {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <span className="material-icons-round text-slate-400">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Score / Time */}
              <div className="text-center py-4 bg-white/5 rounded-xl border border-white/5">
                {selectedMatch.isLive || selectedMatch.isFinished ? (
                  <>
                    <p className="text-4xl sm:text-5xl font-bold text-aged-gold">{selectedMatch.currentScore}</p>
                    {selectedMatch.isLive && selectedMatch.elapsed > 0 && (
                      <div className="flex items-center justify-center gap-3 mt-2">
                        <span className="text-sm text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded-lg">
                          {selectedMatch.elapsed}&apos; dakika
                        </span>
                        <span className="text-xs text-slate-500">
                          {selectedMatch.elapsed <= 45 ? `${45 - selectedMatch.elapsed} dk kaldi (IY)` : selectedMatch.elapsed <= 90 ? `${90 - selectedMatch.elapsed} dk kaldi` : 'Uzatma'}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-4xl sm:text-5xl font-bold text-blue-400">{selectedMatch.matchTime}</p>
                    <p className="text-sm text-slate-400 mt-1">{getCountdown(selectedMatch.matchTime)} sonra</p>
                  </>
                )}
              </div>

              {/* Main Prediction */}
              <div className={`p-4 rounded-xl border ${
                selectedMatch.alertState?.alertLevel === 'hot' ? 'bg-primary/10 border-primary/20' :
                selectedMatch.alertState?.alertLevel === 'warm' ? 'bg-aged-gold/10 border-aged-gold/20' :
                'bg-white/5 border-white/5'
              }`}>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Ana Tahmin</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-western text-primary">{selectedMatch.prediction}</p>
                    {selectedMatch.alertState && selectedMatch.isLive && (
                      <p className={`text-sm font-bold mt-1 ${
                        selectedMatch.alertState.alertLevel === 'hot' ? 'text-primary' :
                        selectedMatch.alertState.alertLevel === 'warm' ? 'text-aged-gold' :
                        'text-slate-400'
                      }`}>
                        {selectedMatch.alertState.message}
                      </p>
                    )}
                    {selectedMatch.alertState?.targetDescription && (
                      <p className="text-xs text-slate-400 mt-1">{selectedMatch.alertState.targetDescription}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{selectedMatch.confidence}%</p>
                    <p className="text-xs text-slate-400">Guven</p>
                  </div>
                </div>
              </div>

              {/* Alternative Predictions */}
              {selectedMatch.alternativeAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-western text-white mb-3 flex items-center gap-2">
                    <span className="material-icons-round text-aged-gold text-sm">auto_awesome</span>
                    Alternatif Tahminler ({selectedMatch.alternativeAlerts.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedMatch.alternativeAlerts.map((alt, idx) => {
                      const altLevel = alt.alertState?.alertLevel;
                      return (
                        <div key={idx} className={`p-3 rounded-lg border flex items-center justify-between ${
                          altLevel === 'hot' ? 'bg-primary/5 border-primary/10' :
                          altLevel === 'warm' ? 'bg-aged-gold/5 border-aged-gold/10' :
                          'bg-white/5 border-white/5'
                        }`}>
                          <div>
                            <p className="text-white font-bold">{alt.prediction}</p>
                            {alt.alertState && selectedMatch.isLive && (
                              <p className={`text-xs mt-0.5 ${
                                altLevel === 'hot' ? 'text-primary' :
                                altLevel === 'warm' ? 'text-aged-gold' :
                                'text-slate-500'
                              }`}>
                                {alt.alertState.message}
                              </p>
                            )}
                          </div>
                          <span className="text-xl font-bold text-aged-gold">{alt.confidence}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note */}
              {selectedMatch.note && (
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Not</p>
                  <p className="text-sm text-slate-300">{selectedMatch.note}</p>
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
