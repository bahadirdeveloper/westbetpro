'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/ui/components/admin/StatCard';
import EngineControls from '@/ui/components/admin/EngineControls';

interface OverviewData {
  total_matches_7d: number;
  total_predictions: number;
  high_confidence_predictions: number;
  pending_predictions: number;
  finished_predictions: number;
  won: number;
  lost: number;
  win_rate: number;
  opportunities_24h: number;
  last_run: {
    status: string;
    created_at: string;
    opportunities_found: number;
  } | null;
}

interface ApiUsageData {
  success: boolean;
  daily_limit: number;
  remaining: number;
  used_today: number;
  plan: string;
  active: boolean;
  checked_at: string;
}

export default function AdminDashboardScreen() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:8000/api/admin/analytics/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setOverview(data.overview);
      } else {
        setError('Veri yüklenemedi');
      }
    } catch (err) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiUsage = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:8000/api/admin/api-usage/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setApiUsage(data);
      }
    } catch {
      // API usage is optional, don't block dashboard
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchApiUsage();
  }, []);

  const handleRunEngine = async () => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch('http://localhost:8000/api/engine/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ days_ahead: 3, min_confidence: 85 })
    });

    if (response.ok) {
      alert('Motor başarıyla çalıştırıldı!');
      fetchOverview();
    } else {
      alert('Motor çalıştırılamadı.');
    }
  };

  const handleTrackResults = async (daysBack: number) => {
    const token = localStorage.getItem('admin_token');
    const response = await fetch('http://localhost:8000/api/results/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ days_back: daysBack })
    });

    if (response.ok) {
      alert('Sonuçlar başarıyla güncellendi!');
      fetchOverview();
    } else {
      alert('Sonuçlar güncellenemedi.');
    }
  };

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
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <span className="material-icons-round text-red-400">error</span>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-3xl text-aged-gold mb-2">DASHBOARD</h1>
        <p className="text-slate-400">Sistem genel durumu ve istatistikler</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="sports_soccer"
          label="Son 7 Gün Maçlar"
          value={overview.total_matches_7d}
          color="blue"
        />
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
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="material-icons-round text-slate-400">pending</span>
            <span className="text-2xl font-bold text-white">{overview.pending_predictions}</span>
          </div>
          <p className="text-sm text-slate-400">Bekleyen Tahminler</p>
        </div>

        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="material-icons-round text-green-400">check_circle</span>
            <span className="text-2xl font-bold text-white">{overview.won}</span>
          </div>
          <p className="text-sm text-slate-400">Kazanılan</p>
        </div>

        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="material-icons-round text-red-400">cancel</span>
            <span className="text-2xl font-bold text-white">{overview.lost}</span>
          </div>
          <p className="text-sm text-slate-400">Kaybedilen</p>
        </div>
      </div>

      {/* Last Run & Engine Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last Run Info */}
        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
            <span className="material-icons-round text-primary">history</span>
            Son Motor Çalışması
          </h3>
          {overview.last_run ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">Durum</span>
                <span className={`text-sm font-medium ${
                  overview.last_run.status === 'completed' ? 'text-green-400' :
                  overview.last_run.status === 'running' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {overview.last_run.status === 'completed' ? 'Tamamlandı' :
                   overview.last_run.status === 'running' ? 'Çalışıyor' :
                   'Hata'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">Bulunan Fırsat</span>
                <span className="text-sm font-medium text-white">{overview.last_run.opportunities_found}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-slate-400">Tarih</span>
                <span className="text-sm font-medium text-white">
                  {new Date(overview.last_run.created_at).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-6">Henüz çalışma kaydı yok</p>
          )}
        </div>

        {/* Engine Controls */}
        <EngineControls
          onRunEngine={handleRunEngine}
          onTrackResults={handleTrackResults}
        />
      </div>

      {/* 24h Activity */}
      <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white mb-1">Son 24 Saat Aktivite</h3>
            <p className="text-sm text-slate-400">Yeni tespit edilen fırsatlar</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-primary">{overview.opportunities_24h}</p>
            <p className="text-sm text-slate-400">Fırsat</p>
          </div>
        </div>
      </div>

      {/* API Usage Card */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <span className="material-icons-round text-blue-400">api</span>
            API-Football Kullanımı
          </h3>
          <button
            onClick={fetchApiUsage}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span className="material-icons-round text-sm">refresh</span>
            Yenile
          </button>
        </div>

        {apiUsage ? (
          <div className="space-y-4">
            {/* Usage Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Günlük Kullanım</span>
                <span className="text-sm font-bold text-white">
                  {apiUsage.used_today} / {apiUsage.daily_limit}
                </span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    apiUsage.daily_limit > 0 && (apiUsage.used_today / apiUsage.daily_limit) > 0.9
                      ? 'bg-red-500'
                      : apiUsage.daily_limit > 0 && (apiUsage.used_today / apiUsage.daily_limit) > 0.7
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{
                    width: `${apiUsage.daily_limit > 0 ? Math.min(100, (apiUsage.used_today / apiUsage.daily_limit) * 100) : 0}%`
                  }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{apiUsage.remaining}</p>
                <p className="text-xs text-slate-400 mt-1">Kalan</p>
              </div>
              <div className="bg-white/5 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-400">{apiUsage.used_today}</p>
                <p className="text-xs text-slate-400 mt-1">Kullanılan</p>
              </div>
              <div className="bg-white/5 p-3 rounded-lg text-center">
                <p className="text-2xl font-bold text-aged-gold">{apiUsage.daily_limit}</p>
                <p className="text-xs text-slate-400 mt-1">Günlük Limit</p>
              </div>
            </div>

            {/* Plan Info */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-slate-400">Plan</span>
              <span className="text-sm font-medium text-white flex items-center gap-2">
                {apiUsage.plan}
                {apiUsage.active && (
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                )}
              </span>
            </div>

            {/* Last Check */}
            {apiUsage.checked_at && (
              <p className="text-xs text-slate-500 text-right">
                Son kontrol: {new Date(apiUsage.checked_at).toLocaleTimeString('tr-TR')}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="material-icons-round text-slate-600 text-3xl mb-2 block">cloud_off</span>
            <p className="text-slate-500 text-sm">API kullanım bilgisi yüklenemedi</p>
          </div>
        )}
      </div>
    </div>
  );
}
