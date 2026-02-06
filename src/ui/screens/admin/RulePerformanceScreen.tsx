'use client';

import { useEffect, useState } from 'react';
import DataTable from '@/ui/components/admin/DataTable';

interface Rule {
  rule_id: string;
  rule_name: string;
  total_predictions: number;
  won: number;
  lost: number;
  pending: number;
  win_rate: number;
  sample_size: number;
  status: 'excellent' | 'good' | 'warning' | 'poor';
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function RulePerformanceScreen() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [minPredictions, setMinPredictions] = useState(3);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(
        `${API_BASE}/api/admin/analytics/rule-performance?min_predictions=${minPredictions}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [minPredictions]);

  const columns = [
    {
      key: 'rule_id',
      label: 'Kural ID',
      render: (id: string) => (
        <span className="font-mono text-sm text-slate-400">{id}</span>
      )
    },
    {
      key: 'rule_name',
      label: 'Kural Adı',
      render: (name: string) => (
        <div className="font-medium text-white">{name}</div>
      )
    },
    {
      key: 'total_predictions',
      label: 'Toplam',
      render: (total: number) => (
        <span className="font-medium">{total}</span>
      )
    },
    {
      key: 'won',
      label: 'Kazanan',
      render: (won: number) => (
        <span className="text-green-400 font-medium">{won}</span>
      )
    },
    {
      key: 'lost',
      label: 'Kaybeden',
      render: (lost: number) => (
        <span className="text-red-400 font-medium">{lost}</span>
      )
    },
    {
      key: 'pending',
      label: 'Bekleyen',
      render: (pending: number) => (
        <span className="text-slate-400">{pending}</span>
      )
    },
    {
      key: 'win_rate',
      label: 'Kazanma Oranı',
      render: (rate: number, row: Rule) => (
        <div className="flex items-center gap-2">
          <div className={`font-bold ${
            row.status === 'excellent' ? 'text-green-400' :
            row.status === 'good' ? 'text-blue-400' :
            row.status === 'warning' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {rate.toFixed(1)}%
          </div>
          {row.status === 'poor' && (
            <span className="material-icons-round text-red-400 text-sm" title="Düşük performans">
              warning
            </span>
          )}
          {row.status === 'warning' && (
            <span className="material-icons-round text-yellow-400 text-sm" title="Dikkat gerekli">
              error_outline
            </span>
          )}
          {row.status === 'excellent' && (
            <span className="material-icons-round text-green-400 text-sm" title="Mükemmel">
              star
            </span>
          )}
        </div>
      )
    },
    {
      key: 'sample_size',
      label: 'Örnek',
      render: (size: number) => (
        <span className="text-sm text-slate-400">{size} maç</span>
      )
    }
  ];

  const stats = {
    excellent: rules.filter(r => r.status === 'excellent').length,
    good: rules.filter(r => r.status === 'good').length,
    warning: rules.filter(r => r.status === 'warning').length,
    poor: rules.filter(r => r.status === 'poor').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-3xl text-aged-gold mb-2">KURAL PERFORMANSI</h1>
        <p className="text-slate-400">Golden Rules başarı oranları ve istatistikler</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card-dark border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Mükemmel (≥70%)</p>
              <p className="text-2xl font-bold text-green-400">{stats.excellent}</p>
            </div>
            <span className="material-icons-round text-green-400 text-3xl">star</span>
          </div>
        </div>

        <div className="bg-card-dark border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">İyi (60-70%)</p>
              <p className="text-2xl font-bold text-blue-400">{stats.good}</p>
            </div>
            <span className="material-icons-round text-blue-400 text-3xl">thumb_up</span>
          </div>
        </div>

        <div className="bg-card-dark border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Dikkat (50-60%)</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.warning}</p>
            </div>
            <span className="material-icons-round text-yellow-400 text-3xl">warning</span>
          </div>
        </div>

        <div className="bg-card-dark border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Zayıf (&lt;50%)</p>
              <p className="text-2xl font-bold text-red-400">{stats.poor}</p>
            </div>
            <span className="material-icons-round text-red-400 text-3xl">error</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-300">Minimum Örnek Sayısı:</label>
          <select
            value={minPredictions}
            onChange={(e) => setMinPredictions(parseInt(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
          >
            <option value="1">1+ maç</option>
            <option value="3">3+ maç</option>
            <option value="5">5+ maç</option>
            <option value="10">10+ maç</option>
            <option value="20">20+ maç</option>
          </select>
          <div className="ml-auto text-sm text-slate-400">
            Toplam {rules.length} kural
          </div>
        </div>
      </div>

      {/* Rules Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-slate-400">Yükleniyor...</p>
          </div>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={rules}
            emptyMessage="Seçilen kriterlere uygun kural bulunamadı"
          />

          {/* Legend */}
          <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
            <h3 className="font-bold text-white mb-4">Performans Göstergeleri</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-green-400 text-sm">star</span>
                <span className="text-slate-300">Mükemmel: Kazanma oranı ≥70%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-blue-400 text-sm">thumb_up</span>
                <span className="text-slate-300">İyi: Kazanma oranı 60-69%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-yellow-400 text-sm">warning</span>
                <span className="text-slate-300">Dikkat: Kazanma oranı 50-59%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-icons-round text-red-400 text-sm">error</span>
                <span className="text-slate-300">Zayıf: Kazanma oranı &lt;50%</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
