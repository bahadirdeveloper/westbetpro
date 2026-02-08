'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/ui/components/admin/StatCard';

interface OverviewData {
  total_predictions: number;
  high_confidence_predictions: number;
  pending_predictions: number;
  finished_predictions: number;
  won: number;
  lost: number;
  win_rate: number;
  today_predictions: number;
  last_7_days: number;
  live_matches: number;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function AdminDashboardScreen() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Get today's date in Istanbul timezone
  const getIstanbulDate = () => {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istanbulTime = new Date(utcTime + 3 * 3600000);
    return istanbulTime.toISOString().split('T')[0];
  };

  // Get date 7 days ago
  const get7DaysAgoDate = () => {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istanbulTime = new Date(utcTime + 3 * 3600000);
    istanbulTime.setDate(istanbulTime.getDate() - 7);
    return istanbulTime.toISOString().split('T')[0];
  };

  const supabaseSelect = async (params: string): Promise<any[]> => {
    const token = localStorage.getItem('admin_token');
    const key = token || SUPABASE_ANON_KEY;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/predictions?${params}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${key}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  };

  const fetchOverview = async () => {
    try {
      setError('');
      const today = getIstanbulDate();
      const sevenDaysAgo = get7DaysAgoDate();

      // Fetch all predictions (parallel requests)
      const [allPredictions, todayPredictions, last7Days] = await Promise.all([
        supabaseSelect('select=id,prediction_result,is_finished,confidence,is_live&limit=10000'),
        supabaseSelect(`select=id,is_live,is_finished&match_date=eq.${today}&limit=1000`),
        supabaseSelect(`select=id,prediction_result,is_finished&match_date=gte.${sevenDaysAgo}&limit=5000`),
      ]);

      // Calculate stats
      const total = allPredictions.length;
      const highConfidence = allPredictions.filter((p: any) => (p.confidence || 0) >= 90).length;
      const finished = allPredictions.filter((p: any) => p.is_finished === true).length;
      const pending = allPredictions.filter((p: any) => !p.is_finished).length;
      const won = allPredictions.filter((p: any) => p.prediction_result === 'won').length;
      const lost = allPredictions.filter((p: any) => p.prediction_result === 'lost').length;
      const winRate = (won + lost) > 0 ? (won / (won + lost)) * 100 : 0;
      const todayCount = todayPredictions.length;
      const liveCount = todayPredictions.filter((p: any) => p.is_live === true).length;
      const last7Count = last7Days.length;

      setOverview({
        total_predictions: total,
        high_confidence_predictions: highConfidence,
        pending_predictions: pending,
        finished_predictions: finished,
        won,
        lost,
        win_rate: winRate,
        today_predictions: todayCount,
        last_7_days: last7Count,
        live_matches: liveCount,
      });

      setLastUpdated(new Date().toLocaleTimeString('tr-TR'));
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError('Veri yüklenemedi: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  // Trigger cron manually
  const handleTriggerCron = async () => {
    try {
      const res = await fetch('/api/cron/live-scores', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        alert(`Cron başarılı! ${data.updated || 0} tahmin güncellendi.`);
        // Refresh dashboard after 2 seconds
        setTimeout(() => fetchOverview(), 2000);
      } else {
        alert('Cron hatası: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch (err: any) {
      alert('Cron çağrısı başarısız: ' + err.message);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-slate-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <span className="material-icons-round text-red-400">error</span>
            <p className="text-red-400">{error}</p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); fetchOverview(); }}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-western text-2xl sm:text-3xl text-aged-gold mb-1 sm:mb-2">DASHBOARD</h1>
          <p className="text-slate-400 text-sm">Sistem genel durumu ve istatistikler</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">Son: {lastUpdated}</span>
          )}
          <button
            onClick={() => { setLoading(true); fetchOverview(); }}
            className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <span className="material-icons-round text-sm">refresh</span>
            Yenile
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          icon="analytics"
          label="Toplam Tahmin"
          value={overview.total_predictions}
          color="primary"
        />
        <StatCard
          icon="star"
          label="Yüksek Güvenilir (≥90%)"
          value={overview.high_confidence_predictions}
          color="yellow"
        />
        <StatCard
          icon="trending_up"
          label="Kazanma Oranı"
          value={`${overview.win_rate.toFixed(1)}%`}
          color={overview.win_rate >= 60 ? 'green' : overview.win_rate >= 50 ? 'yellow' : 'red'}
        />
        <StatCard
          icon="sports_soccer"
          label="Bugün Tahmin"
          value={overview.today_predictions}
          color="blue"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="bg-card-dark border border-green-500/20 rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="material-icons-round text-green-400 text-lg sm:text-2xl">check_circle</span>
            <span className="text-xl sm:text-2xl font-bold text-green-400">{overview.won}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">Kazanilan</p>
        </div>

        <div className="bg-card-dark border border-red-500/20 rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="material-icons-round text-red-400 text-lg sm:text-2xl">cancel</span>
            <span className="text-xl sm:text-2xl font-bold text-red-400">{overview.lost}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">Kaybedilen</p>
        </div>

        <div className="bg-card-dark border border-yellow-500/20 rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="material-icons-round text-yellow-400 text-lg sm:text-2xl">pending</span>
            <span className="text-xl sm:text-2xl font-bold text-yellow-400">{overview.pending_predictions}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">Bekleyen</p>
        </div>

        <div className="bg-card-dark border border-blue-500/20 rounded-xl p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <span className="material-icons-round text-blue-400 text-lg sm:text-2xl">live_tv</span>
            <span className="text-xl sm:text-2xl font-bold text-blue-400">{overview.live_matches}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">Canli Mac</p>
        </div>
      </div>

      {/* Quick Actions & 7 Day Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-4 sm:p-6">
          <h3 className="font-bold text-base sm:text-lg text-white mb-3 sm:mb-4 flex items-center gap-2">
            <span className="material-icons-round text-primary">settings</span>
            Hizli Islemler
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleTriggerCron}
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-icons-round text-green-400">update</span>
                <div className="text-left">
                  <p className="font-medium text-white">Canli Skorlari Guncelle</p>
                  <p className="text-xs text-slate-400">Cron job'i manuel tetikle</p>
                </div>
              </div>
              <span className="material-icons-round text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => { setLoading(true); fetchOverview(); }}
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-icons-round text-blue-400">sync</span>
                <div className="text-left">
                  <p className="font-medium text-white">Dashboard Yenile</p>
                  <p className="text-xs text-slate-400">Tum istatistikleri guncelle</p>
                </div>
              </div>
              <span className="material-icons-round text-slate-400">chevron_right</span>
            </button>
          </div>
        </div>

        {/* 7 Day Summary */}
        <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-6">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <span className="material-icons-round text-primary">date_range</span>
            Son 7 Gun Ozeti
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">{overview.last_7_days}</p>
              <p className="text-sm text-slate-400 mt-1">Toplam Tahmin</p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg text-center">
              <p className="text-3xl font-bold text-aged-gold">
                {overview.finished_predictions}
              </p>
              <p className="text-sm text-slate-400 mt-1">Tamamlanan</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Basari Orani</span>
              <span className={`text-lg font-bold ${
                overview.win_rate >= 60 ? 'text-green-400' :
                overview.win_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {overview.win_rate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  overview.win_rate >= 60 ? 'bg-green-500' :
                  overview.win_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, overview.win_rate)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
              <span>{overview.won} kazanilan</span>
              <span>{overview.lost} kaybedilen</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
          <span className="material-icons-round text-slate-400">info</span>
          Sistem Bilgisi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-sm text-slate-400">Veri Kaynagi</span>
            <span className="text-sm font-medium text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Supabase
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-sm text-slate-400">Canli Skor API</span>
            <span className="text-sm font-medium text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              API-Football
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-sm text-slate-400">Versiyon</span>
            <span className="text-sm font-medium text-white">v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
