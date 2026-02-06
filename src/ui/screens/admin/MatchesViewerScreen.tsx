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
  home_odds: number;
  draw_odds: number;
  away_odds: number;
  status: string;
}

export default function MatchesViewerScreen() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'upcoming' | 'today' | 'finished'>('upcoming');
  const [league, setLeague] = useState<string>('');
  const [leagues, setLeagues] = useState<string[]>([]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const params = new URLSearchParams({
        filter_type: filterType,
        limit: '100'
      });
      if (league) params.append('league', league);

      const response = await fetch(`http://localhost:8000/api/matches?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);

        // Extract unique leagues
        const uniqueLeagues = [...new Set(data.matches.map((m: Match) => m.league))];
        setLeagues(uniqueLeagues as string[]);
      }
    } catch (err) {
      console.error('Failed to fetch matches:', err);
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
          <div className="font-medium">{new Date(date).toLocaleDateString('tr-TR')}</div>
          <div className="text-xs text-slate-500">{row.time}</div>
        </div>
      )
    },
    {
      key: 'home_team',
      label: 'Maç',
      render: (home: string, row: Match) => (
        <div className="font-medium">
          <div>{home}</div>
          <div className="text-slate-400">vs</div>
          <div>{row.away_team}</div>
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
      key: 'home_odds',
      label: 'Oranlar (1-X-2)',
      render: (homeOdds: number, row: Match) => (
        <div className="flex gap-2">
          <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-mono">
            {homeOdds?.toFixed(2) || '-'}
          </span>
          <span className="bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded text-xs font-mono">
            {row.draw_odds?.toFixed(2) || '-'}
          </span>
          <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs font-mono">
            {row.away_odds?.toFixed(2) || '-'}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Durum',
      render: (status: string) => (
        <span className={`text-xs px-2 py-1 rounded ${
          status === 'upcoming' ? 'bg-blue-500/10 text-blue-400' :
          status === 'live' ? 'bg-green-500/10 text-green-400' :
          'bg-slate-500/10 text-slate-400'
        }`}>
          {status === 'upcoming' ? 'Yaklaşan' : status === 'live' ? 'Canlı' : 'Bitti'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-3xl text-aged-gold mb-2">MAÇLAR</h1>
        <p className="text-slate-400">Tüm maçları görüntüle ve filtrele</p>
      </div>

      {/* Filters */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <div className="flex flex-wrap gap-4">
          {/* Tab Filters */}
          <div className="flex gap-2">
            {(['today', 'upcoming', 'finished'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterType === type
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {type === 'today' ? 'Bugün' : type === 'upcoming' ? 'Yaklaşan' : 'Biten'}
              </button>
            ))}
          </div>

          {/* League Filter */}
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
          >
            <option value="">Tüm Ligler</option>
            {leagues.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Match Count */}
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
            <span className="material-icons-round text-sm">sports_soccer</span>
            <span>{matches.length} maç</span>
          </div>
        </div>
      </div>

      {/* Matches Table */}
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
