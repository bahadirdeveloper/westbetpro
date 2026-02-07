'use client';

import { useState } from 'react';

interface AnalyzeResult {
  success: boolean;
  date?: string;
  total_fixtures?: number;
  odds_analyzed?: number;
  rules_matched?: number;
  predictions_inserted?: number;
  predictions_skipped?: number;
  api_calls?: number;
  golden_rules_count?: number;
  error?: string;
  sample_results?: Array<{
    match: string;
    league: string;
    time: string;
    prediction: string;
    confidence: number;
    rules_matched: number;
    odds_45: number;
  }>;
}

export default function EngineControlScreen() {
  const [todayResult, setTodayResult] = useState<AnalyzeResult | null>(null);
  const [tomorrowResult, setTomorrowResult] = useState<AnalyzeResult | null>(null);
  const [todayLoading, setTodayLoading] = useState(false);
  const [tomorrowLoading, setTomorrowLoading] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);
  const [cronLoading, setCronLoading] = useState(false);

  const runAnalyze = async (dateParam: 'today' | 'tomorrow') => {
    const setLoading = dateParam === 'today' ? setTodayLoading : setTomorrowLoading;
    const setResult = dateParam === 'today' ? setTodayResult : setTomorrowResult;

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/engine/analyze?date=${dateParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const runLiveScores = async () => {
    setCronLoading(true);
    setCronResult(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/cron/live-scores', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setCronResult(data);
    } catch (e: any) {
      setCronResult({ success: false, error: e.message });
    } finally {
      setCronLoading(false);
    }
  };

  const ResultCard = ({ title, result, loading }: { title: string; result: AnalyzeResult | null; loading: boolean }) => {
    if (loading) {
      return (
        <div className="bg-white/5 rounded-xl p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-3"></div>
          <p className="text-slate-400 text-sm">{title} analiz ediliyor...</p>
          <p className="text-slate-500 text-xs mt-1">API-Football&apos;dan oranlar çekiliyor, kurallar eşleştiriliyor...</p>
        </div>
      );
    }

    if (!result) return null;

    if (!result.success) {
      return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-bold text-sm">{title} - Hata</p>
          <p className="text-slate-400 text-xs mt-1">{result.error}</p>
        </div>
      );
    }

    return (
      <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white font-bold">{title}</p>
          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded font-bold">{result.date}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Toplam Maç', value: result.total_fixtures, color: 'text-slate-300' },
            { label: 'Kural Eşleşen', value: result.rules_matched, color: 'text-primary' },
            { label: 'Eklenen', value: result.predictions_inserted, color: 'text-green-400' },
            { label: 'API Çağrı', value: result.api_calls, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
              <p className={`text-lg font-bold ${color}`}>{value ?? 0}</p>
              <p className="text-slate-500 text-[10px]">{label}</p>
            </div>
          ))}
        </div>

        {result.sample_results && result.sample_results.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-slate-400 text-xs font-bold">Örnek Sonuçlar:</p>
            {result.sample_results.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-xs">
                <div>
                  <p className="text-white font-medium">{s.match}</p>
                  <p className="text-slate-500">{s.league} • {s.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-primary font-bold">{s.prediction}</p>
                  <p className="text-slate-400">%{s.confidence} • {s.rules_matched} kural</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {result.predictions_skipped !== undefined && result.predictions_skipped > 0 && (
          <p className="text-slate-500 text-xs">{result.predictions_skipped} tahmin zaten mevcut (atlandı)</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-3xl text-aged-gold mb-2">MOTOR KONTROLÜ</h1>
        <p className="text-slate-400">API-Football otonom analiz motoru ve canlı skor güncellemesi</p>
      </div>

      {/* API Engine Buttons */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
          <span className="material-icons-round text-primary">auto_awesome</span>
          Otonom Analiz Motoru
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          API-Football&apos;dan açılış oranlarını çeker, 49 golden rule ile eşleştirir, tahminleri otomatik oluşturur.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Today */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-white">Bugünü Analiz Et</p>
                <p className="text-xs text-slate-400">Bugünün maçlarının oranlarını çek</p>
              </div>
              <button
                onClick={() => runAnalyze('today')}
                disabled={todayLoading}
                className="bg-primary hover:bg-primary/90 text-black px-5 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {todayLoading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></span>
                ) : (
                  <span className="material-icons-round text-sm">today</span>
                )}
                {todayLoading ? 'Çalışıyor...' : 'Bugün'}
              </button>
            </div>
            <ResultCard title="Bugün" result={todayResult} loading={todayLoading} />
          </div>

          {/* Tomorrow */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-white">Yarını Analiz Et</p>
                <p className="text-xs text-slate-400">Yarının maçlarının oranlarını çek</p>
              </div>
              <button
                onClick={() => runAnalyze('tomorrow')}
                disabled={tomorrowLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {tomorrowLoading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                ) : (
                  <span className="material-icons-round text-sm">event</span>
                )}
                {tomorrowLoading ? 'Çalışıyor...' : 'Yarın'}
              </button>
            </div>
            <ResultCard title="Yarın" result={tomorrowResult} loading={tomorrowLoading} />
          </div>
        </div>
      </div>

      {/* Live Score Updater */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
          <span className="material-icons-round text-green-400">sports_soccer</span>
          Canlı Skor Güncelleyici
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Canlı skorları API-Football&apos;dan çek ve tahmin sonuçlarını güncelle</p>
            <p className="text-slate-500 text-xs mt-1">Not: Bu işlem cron ile 2 dakikada bir otomatik çalışır</p>
          </div>
          <button
            onClick={runLiveScores}
            disabled={cronLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {cronLoading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
            ) : (
              <span className="material-icons-round text-sm">update</span>
            )}
            {cronLoading ? 'Güncelleniyor...' : 'Şimdi Güncelle'}
          </button>
        </div>

        {cronResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${cronResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {cronResult.success ? (
              <p>Güncellendi: {cronResult.updated || 0} maç güncellendi, {cronResult.api_calls || 0} API çağrısı</p>
            ) : (
              <p>Hata: {cronResult.error || 'Bilinmeyen hata'}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
