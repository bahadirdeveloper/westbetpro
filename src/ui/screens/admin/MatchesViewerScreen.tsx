'use client';

import { useEffect, useState } from 'react';
import DataTable from '@/ui/components/admin/DataTable';

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  date: string;
  time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  prediction: string;
  confidence: number;
}

export default function MatchesViewerScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'upcoming' | 'today' | 'finished'>('today');
  const [league, setLeague] = useState<string>('');
  const [leagues, setLeagues] = useState<string[]>([]);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        filter_type: filterType,
        limit: '100'
      });
      if (league) params.append('league', league);

      const response = await fetch(`/api/matches?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || `Hata: ${response.status}`);
        return;
      }

      const data = await response.json();
      setMatches(data.matches || []);

      // Extract unique leagues
      const uniqueLeagues = [...new Set((data.matches || []).map((m: Match) => m.league).filter(Boolean))];
      setLeagues(uniqueLeagues as string[]);
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [filterType, league]);

  const columns = [
    {
      key: 'date',
      label: 'Tarih',
      render: (date: string, row: Match) => (
        <div>
          <div className="font-medium">{date ? new Date(date).toLocaleDateString('tr-TR') : '-'}</div>
          <div className="text-xs text-slate-500">{row.time || ''}</div>
        </div>
      )
    },
    {
      key: 'home_team',
      label: 'Maç',
      render: (home: string, row: Match) => (
        <div className="font-medium">
          <span>{home}</span>
          <span className="text-slate-500 mx-1">vs</span>
          <span>{row.away_team}</span>
        </div>
      )
    },
    {
      key: 'league',
      label: 'Lig',
      render: (league: string) => (
        <span className="text-xs bg-white/5 px-2 py-1 rounded">{league}</span>
      )
    },
    {
      key: 'prediction',
      label: 'Tahmin',
      render: (prediction: string, row: Match) => prediction ? (
        <div>
          <span className="text-primary font-bold text-sm">{prediction}</span>
          <span className="text-slate-400 text-xs ml-1">%{row.confidence}</span>
        </div>
      ) : <span className="text-slate-600">-</span>
    },
    {
      key: 'status',
      label: 'Durum',
      render: (status: string, row: Match) => (
        <div>
          <span className={`text-xs px-2 py-1 rounded ${
            status === 'upcoming' ? 'bg-blue-500/10 text-blue-400' :
            status === 'live' ? 'bg-green-500/10 text-green-400' :
            'bg-slate-500/10 text-slate-400'
          }`}>
            {status === 'upcoming' ? 'Yaklaşan' : status === 'live' ? 'Canlı' : 'Bitti'}
          </span>
          {(status === 'finished' || status === 'live') && row.home_score !== null && (
            <span className="text-aged-gold font-bold text-sm ml-2">{row.home_score}-{row.away_score}</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-western text-2xl sm:text-3xl text-aged-gold mb-1 sm:mb-2">MAÇLAR</h1>
        <p className="text-slate-400">Tüm maçları görüntüle ve filtrele</p>
      </div>

      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
          <div className="flex gap-1.5 sm:gap-2">
            {(['today', 'upcoming', 'finished'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  filterType === type
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {type === 'today' ? 'Bugün' : type === 'upcoming' ? 'Yaklaşan' : 'Biten'}
              </button>
            ))}
          </div>

          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-white text-xs sm:text-sm"
          >
            <option value="">Tüm Ligler</option>
            {leagues.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <div className="sm:ml-auto flex items-center gap-2 text-xs sm:text-sm text-slate-400">
            <span className="material-icons-round text-sm">sports_soccer</span>
            <span>{matches.length} maç</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-bold text-sm">Hata: {error}</p>
        </div>
      )}

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
          data={matches}
          emptyMessage="Seçilen filtrelere uygun maç bulunamadı"
        />
      )}
    </div>
  );
}
