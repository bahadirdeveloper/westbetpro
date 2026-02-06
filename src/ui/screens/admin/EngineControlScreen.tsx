'use client';

import { useEffect, useState } from 'react';
import EngineControls from '@/ui/components/admin/EngineControls';
import DataTable from '@/ui/components/admin/DataTable';

interface Run {
  id: string;
  status: string;
  started_at: string;
  completed_at: string;
  opportunities_found: number;
  triggered_by: string;
}

export default function EngineControlScreen() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:8000/api/engine/runs?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
      }
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
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
      fetchRuns();
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
      fetchRuns();
    } else {
      alert('Sonuçlar güncellenemedi.');
    }
  };

  const columns = [
    {
      key: 'status',
      label: 'Durum',
      render: (status: string) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          status === 'completed' ? 'bg-green-500/10 text-green-400' :
          status === 'running' ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-red-500/10 text-red-400'
        }`}>
          <span className="material-icons-round text-xs">
            {status === 'completed' ? 'check_circle' : status === 'running' ? 'sync' : 'error'}
          </span>
          {status === 'completed' ? 'Tamamlandı' : status === 'running' ? 'Çalışıyor' : 'Hata'}
        </span>
      )
    },
    {
      key: 'started_at',
      label: 'Başlangıç',
      render: (date: string) => new Date(date).toLocaleString('tr-TR')
    },
    {
      key: 'completed_at',
      label: 'Bitiş',
      render: (date: string) => date ? new Date(date).toLocaleString('tr-TR') : '-'
    },
    {
      key: 'opportunities_found',
      label: 'Fırsatlar',
      render: (value: number) => (
        <span className="font-bold text-primary">{value}</span>
      )
    },
    {
      key: 'triggered_by',
      label: 'Çalıştıran',
      render: (value: string) => value || 'Sistem'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-3xl text-aged-gold mb-2">MOTOR KONTROLÜ</h1>
        <p className="text-slate-400">Opportunity Engine yönetimi ve çalışma geçmişi</p>
      </div>

      {/* Engine Controls */}
      <EngineControls
        onRunEngine={handleRunEngine}
        onTrackResults={handleTrackResults}
      />

      {/* Run History */}
      <div>
        <h2 className="font-bold text-xl text-white mb-4 flex items-center gap-2">
          <span className="material-icons-round text-primary">history</span>
          Çalışma Geçmişi
        </h2>

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
            data={runs}
            emptyMessage="Henüz çalışma kaydı yok"
          />
        )}
      </div>
    </div>
  );
}
