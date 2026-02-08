'use client';

import { useEffect, useState } from 'react';
import DataTable from '@/ui/components/admin/DataTable';

interface Prediction {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  prediction_type: string;
  predicted_value: string;
  confidence: number;
  result: string;
  matched_rules: any[];
  alternative_predictions: any[];
}

export default function PredictionsViewerScreen() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`/api/predictions?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const text = await response.text();
        let errMsg = `Hata: ${response.status}`;
        try { errMsg = JSON.parse(text).error || errMsg; } catch { errMsg = text.substring(0, 100) || errMsg; }
        setError(errMsg);
        return;
      }

      const data = await response.json();
      const sorted = (data.predictions || []).sort((a: Prediction, b: Prediction) =>
        b.confidence - a.confidence
      );
      setPredictions(sorted);
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  const handleRowClick = (prediction: Prediction) => {
    setSelectedPrediction(prediction);
    setShowModal(true);
  };

  const columns = [
    {
      key: 'confidence',
      label: 'Güven',
      render: (confidence: number) => (
        <div className="flex items-center gap-2">
          <div className={`font-bold text-lg ${
            confidence >= 90 ? 'text-green-400' :
            confidence >= 80 ? 'text-yellow-400' :
            'text-slate-400'
          }`}>
            {confidence}%
          </div>
          {confidence >= 90 && (
            <span className="material-icons-round text-green-400 text-sm">star</span>
          )}
        </div>
      )
    },
    {
      key: 'home_team',
      label: 'Maç',
      render: (home: string, row: Prediction) => (
        <div>
          <div className="font-medium">{home} vs {row.away_team}</div>
          <div className="text-xs text-slate-500">{row.league}</div>
        </div>
      )
    },
    {
      key: 'match_date',
      label: 'Tarih',
      render: (date: string) => new Date(date).toLocaleDateString('tr-TR')
    },
    {
      key: 'prediction_type',
      label: 'Tahmin',
      render: (type: string, row: Prediction) => (
        <div>
          <div className="font-medium text-primary">{type}</div>
          <div className="text-xs text-slate-400">{row.predicted_value}</div>
        </div>
      )
    },
    {
      key: 'result',
      label: 'Sonuç',
      render: (result: string) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          result === 'won' ? 'bg-green-500/10 text-green-400' :
          result === 'lost' ? 'bg-red-500/10 text-red-400' :
          'bg-slate-500/10 text-slate-400'
        }`}>
          <span className="material-icons-round text-xs">
            {result === 'won' ? 'check_circle' : result === 'lost' ? 'cancel' : 'schedule'}
          </span>
          {result === 'won' ? 'Kazandı' : result === 'lost' ? 'Kaybetti' : 'Bekliyor'}
        </span>
      )
    },
    {
      key: 'matched_rules',
      label: 'Kurallar',
      render: (rules: any[]) => (
        <span className="text-sm text-slate-400">{rules?.length || 0} kural</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-2xl sm:text-3xl text-aged-gold mb-1 sm:mb-2">TAHMİNLER</h1>
        <p className="text-slate-400">Tüm tahminleri görüntüle ve detayları incele</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Toplam</span>
            <span className="text-2xl font-bold text-white">{predictions.length}</span>
          </div>
        </div>
        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Yüksek Güven (≥90%)</span>
            <span className="text-2xl font-bold text-green-400">
              {predictions.filter(p => p.confidence >= 90).length}
            </span>
          </div>
        </div>
        <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Bekleyen</span>
            <span className="text-2xl font-bold text-yellow-400">
              {predictions.filter(p => p.result === 'pending').length}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-bold text-sm">Hata: {error}</p>
        </div>
      )}

      {/* Predictions Table */}
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
          data={predictions}
          onRowClick={handleRowClick}
          emptyMessage="Henüz tahmin bulunamadı"
        />
      )}

      {/* Detail Modal */}
      {showModal && selectedPrediction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card-dark border border-aged-gold/20 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-aged-gold/10">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl text-white">Tahmin Detayları</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <span className="material-icons-round">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Match Info */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-bold text-white mb-2">Maç Bilgisi</h3>
                <p className="text-lg">{selectedPrediction.home_team} vs {selectedPrediction.away_team}</p>
                <p className="text-sm text-slate-400">{selectedPrediction.league}</p>
                <p className="text-sm text-slate-400">{new Date(selectedPrediction.match_date).toLocaleString('tr-TR')}</p>
              </div>

              {/* Prediction */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-bold text-white mb-2">Tahmin</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary font-medium">{selectedPrediction.prediction_type}</p>
                    <p className="text-sm text-slate-400">{selectedPrediction.predicted_value}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">{selectedPrediction.confidence}%</p>
                    <p className="text-xs text-slate-400">Güven</p>
                  </div>
                </div>
              </div>

              {/* Matched Rules */}
              {selectedPrediction.matched_rules && selectedPrediction.matched_rules.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="font-bold text-white mb-2">Eşleşen Kurallar ({selectedPrediction.matched_rules.length})</h3>
                  <div className="space-y-2">
                    {selectedPrediction.matched_rules.map((rule, idx) => (
                      <div key={idx} className="text-sm bg-white/5 rounded p-2">
                        <p className="font-medium text-primary">{rule.rule_name || rule.rule_id}</p>
                        <p className="text-xs text-slate-400">Güven: {rule.confidence}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-bold text-white mb-2">Sonuç</h3>
                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded font-medium ${
                  selectedPrediction.result === 'won' ? 'bg-green-500/10 text-green-400' :
                  selectedPrediction.result === 'lost' ? 'bg-red-500/10 text-red-400' :
                  'bg-slate-500/10 text-slate-400'
                }`}>
                  <span className="material-icons-round">
                    {selectedPrediction.result === 'won' ? 'check_circle' :
                     selectedPrediction.result === 'lost' ? 'cancel' : 'schedule'}
                  </span>
                  {selectedPrediction.result === 'won' ? 'Kazandı' :
                   selectedPrediction.result === 'lost' ? 'Kaybetti' : 'Bekliyor'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
