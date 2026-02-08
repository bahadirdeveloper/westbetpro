'use client';

import { useEffect, useState } from 'react';
import DataTable from '@/ui/components/admin/DataTable';

interface Log {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  event: string;
  details: any;
}

export default function LogsViewerScreen() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({ limit: '100' });
      if (level) params.append('level', level);

      const response = await fetch(`/api/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || `Hata: ${response.status}`);
        return;
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [level]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, level]);

  const columns = [
    {
      key: 'timestamp',
      label: 'Zaman',
      render: (timestamp: string) => (
        <div className="text-sm">
          <div>{new Date(timestamp).toLocaleDateString('tr-TR')}</div>
          <div className="text-xs text-slate-500">
            {new Date(timestamp).toLocaleTimeString('tr-TR')}
          </div>
        </div>
      )
    },
    {
      key: 'level',
      label: 'Seviye',
      render: (level: string) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          level === 'ERROR' ? 'bg-red-500/10 text-red-400' :
          level === 'WARNING' ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-blue-500/10 text-blue-400'
        }`}>
          <span className="material-icons-round text-xs">
            {level === 'ERROR' ? 'error' : level === 'WARNING' ? 'warning' : 'info'}
          </span>
          {level}
        </span>
      )
    },
    {
      key: 'event',
      label: 'Olay',
      render: (event: string) => (
        <span className="font-medium text-white">{event}</span>
      )
    },
    {
      key: 'details',
      label: 'Detaylar',
      render: (details: any) => (
        <div className="max-w-xs sm:max-w-md overflow-x-auto">
          {typeof details === 'string' ? (
            <span className="text-sm text-slate-400 truncate block">{details}</span>
          ) : (
            <pre className="text-xs text-slate-400 whitespace-pre-wrap break-all">
              {JSON.stringify(details, null, 2).substring(0, 100)}...
            </pre>
          )}
        </div>
      )
    }
  ];

  const stats = {
    total: logs.length,
    info: logs.filter(l => l.level === 'INFO').length,
    warning: logs.filter(l => l.level === 'WARNING').length,
    error: logs.filter(l => l.level === 'ERROR').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-2xl sm:text-3xl text-aged-gold mb-1 sm:mb-2">SİSTEM LOGLARI</h1>
        <p className="text-slate-400">Sistem olaylarını izle ve filtrele</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Toplam</span>
            <span className="text-2xl font-bold text-white">{stats.total}</span>
          </div>
        </div>
        <div className="bg-card-dark border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Info</span>
            <span className="text-2xl font-bold text-blue-400">{stats.info}</span>
          </div>
        </div>
        <div className="bg-card-dark border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Warning</span>
            <span className="text-2xl font-bold text-yellow-400">{stats.warning}</span>
          </div>
        </div>
        <div className="bg-card-dark border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Error</span>
            <span className="text-2xl font-bold text-red-400">{stats.error}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            {['', 'INFO', 'WARNING', 'ERROR'].map((lvl) => (
              <button
                key={lvl || 'all'}
                onClick={() => setLevel(lvl)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all flex-shrink-0 ${
                  level === lvl
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {lvl || 'Tümü'}
              </button>
            ))}
          </div>

          <div className="sm:ml-auto flex items-center gap-3 sm:gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
              />
              <span className="text-xs sm:text-sm text-slate-400">Oto Yenile</span>
            </label>

            <button
              onClick={() => fetchLogs()}
              className="bg-white/5 hover:bg-white/10 text-slate-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all flex items-center gap-2 text-xs sm:text-sm"
            >
              <span className="material-icons-round text-sm">refresh</span>
              Yenile
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-bold text-sm">Hata: {error}</p>
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-slate-400">Yükleniyor...</p>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          emptyMessage="Seçilen filtrelere uygun log bulunamadı"
        />
      )}

      {/* Info */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="material-icons-round text-blue-400">info</span>
          <div>
            <h3 className="font-bold text-white mb-1">Log Bilgisi</h3>
            <p className="text-sm text-slate-400">
              Loglar en yeniden eskiye doğru sıralanır. Otomatik yenileme aktifken her 5 saniyede bir güncellenir.
              Detaylı log içeriğini görmek için bir satıra tıklayabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
