'use client';

import { useEffect, useState } from 'react';
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
  predictionResult: boolean | null;
}

export default function LiveAnalysisScreen() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    let isFirst = true;

    async function fetchAlerts() {
      try {
        if (isFirst) setLoading(true);
        const res = await fetch(`/api/live-alerts?t=${Date.now()}`, { cache: 'no-store' });
        if (!isMounted) return;
        const data = await res.json();
        if (data.success) {
          setAlerts(data.alerts || []);
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
  }, []);

  const hotAlerts = alerts.filter(a => !a.isFinished && a.alertState?.alertLevel === 'hot');
  const warmAlerts = alerts.filter(a => !a.isFinished && a.alertState?.alertLevel === 'warm');
  const liveMatches = alerts.filter(a => !a.isFinished && (!a.alertState || a.alertState.alertLevel === 'cold'));
  const finishedMatches = alerts.filter(a => a.isFinished);

  function getAlertCardClass(level: string | undefined): string {
    if (level === 'hot') return 'alert-hot alert-enter';
    if (level === 'warm') return 'alert-warm alert-enter';
    return 'border border-white/5';
  }

  function renderAlertCard(alert: LiveAlert, showAlternatives: boolean = true) {
    const level = alert.alertState?.alertLevel;

    return (
      <div
        key={alert.id}
        className={`bg-card-dark rounded-2xl p-4 sm:p-5 relative overflow-hidden ${getAlertCardClass(level)} transition-all`}
      >
        {/* Alert Level Badge */}
        {level === 'hot' && !alert.isFinished && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">SICAK</span>
          </div>
        )}
        {level === 'warm' && !alert.isFinished && (
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-bold text-aged-gold uppercase tracking-wider px-2 py-1 bg-aged-gold/10 rounded">YAKIN</span>
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
        <span className="text-[10px] px-2 py-1 bg-white/5 text-slate-400 rounded-md font-bold uppercase tracking-wider">
          {alert.league}
        </span>

        {/* Teams & Score */}
        <div className="mt-3 mb-2">
          <h4 className="text-base sm:text-lg font-bold text-white pr-16">
            {alert.homeTeam} - {alert.awayTeam}
          </h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-aged-gold text-2xl font-bold">{alert.currentScore}</span>
            {!alert.isFinished && alert.elapsed > 0 && (
              <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                {alert.elapsed}&apos;
              </span>
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
            {alert.alertState && !alert.isFinished && (
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
          {alert.alertState && !alert.isFinished && alert.alertState.targetDescription && (
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
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-western text-white mb-2 tracking-wide uppercase">
              Canli Av Sahasi
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Tahminlerimize yakin canli maclar - otomatik alarm sistemi aktif
            </p>
          </div>

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
                <span className="material-icons-round text-slate-400 text-lg">sports_soccer</span>
                <h3 className="text-lg font-western text-slate-300 uppercase tracking-wider">
                  Aktif Maclar
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                  {liveMatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {liveMatches.map(alert => renderAlertCard(alert, false))}
              </div>
            </div>
          )}

          {/* Recently Finished */}
          {!loading && finishedMatches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-icons-round text-slate-500 text-lg">check_circle</span>
                <h3 className="text-lg font-western text-slate-500 uppercase tracking-wider">
                  Tamamlanan
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                  {finishedMatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
                {finishedMatches.map(alert => renderAlertCard(alert))}
              </div>
            </div>
          )}
        </section>
      </main>

      <MobileNav activeTab="canli-analiz" />
    </div>
  );
}
