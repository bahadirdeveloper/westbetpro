'use client';

import { useState } from 'react';

interface EngineControlsProps {
  onRunEngine: () => Promise<void>;
  onTrackResults: (daysBack: number) => Promise<void>;
  isLoading?: boolean;
}

export default function EngineControls({ onRunEngine, onTrackResults, isLoading = false }: EngineControlsProps) {
  const [daysBack, setDaysBack] = useState(3);
  const [trackLoading, setTrackLoading] = useState(false);
  const [engineLoading, setEngineLoading] = useState(false);

  const handleRunEngine = async () => {
    setEngineLoading(true);
    try {
      await onRunEngine();
    } finally {
      setEngineLoading(false);
    }
  };

  const handleTrackResults = async () => {
    setTrackLoading(true);
    try {
      await onTrackResults(daysBack);
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
      <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
        <span className="material-icons-round text-primary">settings</span>
        Motor Kontrolleri
      </h3>

      <div className="space-y-4">
        {/* Run Engine */}
        <div className="p-4 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-white">Opportunity Engine Çalıştır</p>
              <p className="text-sm text-slate-400">Yeni fırsatları tespit et</p>
            </div>
            <button
              onClick={handleRunEngine}
              disabled={engineLoading || isLoading}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {engineLoading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  Çalışıyor...
                </>
              ) : (
                <>
                  <span className="material-icons-round text-sm">play_arrow</span>
                  Çalıştır
                </>
              )}
            </button>
          </div>
        </div>

        {/* Track Results */}
        <div className="p-4 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-white">Sonuçları Güncelle</p>
              <p className="text-sm text-slate-400">Maç sonuçlarını takip et</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Kaç gün geriye git?</label>
              <input
                type="number"
                min="1"
                max="30"
                value={daysBack}
                onChange={(e) => setDaysBack(parseInt(e.target.value) || 3)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <button
              onClick={handleTrackResults}
              disabled={trackLoading || isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-5"
            >
              {trackLoading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  Güncelliyor...
                </>
              ) : (
                <>
                  <span className="material-icons-round text-sm">update</span>
                  Güncelle
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
