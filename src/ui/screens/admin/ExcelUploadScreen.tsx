'use client';

import { useState, useRef } from 'react';

interface UploadResult {
  success: boolean;
  file_name: string;
  sheet_name: string;
  total_rows: number;
  matched: number;
  inserted: number;
  duplicates: number;
  skipped: number;
  skipped_details: Array<{ row: number; reason: string }>;
  detected_columns: Record<string, string | null>;
  sample_results: Array<{
    match: string;
    prediction: string;
    confidence: number;
    rules: number;
    odds_45: number;
  }>;
  error?: string;
}

export default function ExcelUploadScreen() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setError('Oturum süresi dolmuş. Tekrar giriş yapın.');
        return;
      }

      const formData = new FormData();
      formData.append('excel', file);

      const res = await fetch('/api/engine/excel-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Yükleme başarısız');
        if (data.detected_columns) {
          setResult(data);
        }
        return;
      }

      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Bağlantı hatası');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-3xl text-aged-gold mb-2">EXCEL YÜKLEME</h1>
        <p className="text-slate-400">Açılış oranları Excel dosyasını yükleyin, sistem golden rules ile eşleştirip tahminleri otomatik oluşturur.</p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${dragOver
            ? 'border-primary bg-primary/10'
            : 'border-aged-gold/30 hover:border-primary/50 hover:bg-primary/5'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFileChange}
          className="hidden"
        />
        {uploading ? (
          <div>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-primary font-bold text-lg">İşleniyor...</p>
            <p className="text-slate-400 text-sm mt-2">Excel okunuyor, kurallar eşleştiriliyor, tahminler yazılıyor...</p>
          </div>
        ) : (
          <div>
            <span className="material-icons-round text-5xl text-aged-gold/60 mb-4 block">upload_file</span>
            <p className="text-lg font-bold text-white mb-2">Excel Dosyası Yükle</p>
            <p className="text-slate-400 text-sm">Sürükle bırak veya tıkla</p>
            <p className="text-slate-500 text-xs mt-3">.xlsx, .xls formatları desteklenir</p>
          </div>
        )}
      </div>

      {/* Expected Format Info */}
      <div className="bg-card-dark rounded-xl border border-aged-gold/10 p-5">
        <h3 className="text-white font-bold flex items-center gap-2 mb-3">
          <span className="material-icons-round text-primary text-lg">info</span>
          Beklenen Excel Formatı
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
          {[
            { col: 'Ev Sahibi', req: true },
            { col: 'Deplasman', req: true },
            { col: 'Lig', req: false },
            { col: 'Tarih', req: false },
            { col: 'Saat', req: false },
            { col: '4-5', req: true },
            { col: '2,5 Ü', req: false },
            { col: '2,5 A', req: false },
            { col: '3,5 Ü', req: false },
            { col: '3,5 A', req: false },
            { col: '2-3', req: false },
            { col: 'KG VAR', req: false },
          ].map(({ col, req }) => (
            <div key={col} className={`px-3 py-2 rounded-lg ${req ? 'bg-primary/10 border border-primary/20' : 'bg-white/5'}`}>
              <span className={req ? 'text-primary font-bold' : 'text-slate-400'}>{col}</span>
              {req && <span className="text-red-400 ml-1">*</span>}
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs mt-3">* Zorunlu sütunlar. Oran sütunlarında minimum "4-5" gereklidir.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="material-icons-round text-red-400 text-lg">error</span>
            <div>
              <p className="text-red-400 font-bold">{error}</p>
              {result?.detected_columns && (
                <p className="text-slate-400 text-xs mt-2">
                  Bulunan sütunlar: {Object.values(result.detected_columns).filter(Boolean).join(', ') || 'Yok'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Result */}
      {result?.success && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Satır', value: result.total_rows, icon: 'table_rows', color: 'text-slate-300' },
              { label: 'Eşleşen', value: result.matched, icon: 'check_circle', color: 'text-primary' },
              { label: 'Eklenen', value: result.inserted, icon: 'add_circle', color: 'text-green-400' },
              { label: 'Mükerrer', value: result.duplicates, icon: 'content_copy', color: 'text-yellow-400' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-card-dark rounded-xl border border-aged-gold/10 p-4 text-center">
                <span className={`material-icons-round ${color} text-2xl mb-1 block`}>{icon}</span>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            ))}
          </div>

          {/* Detected Columns */}
          <div className="bg-card-dark rounded-xl border border-aged-gold/10 p-4">
            <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
              <span className="material-icons-round text-primary text-sm">view_column</span>
              Algılanan Sütunlar
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(result.detected_columns).map(([key, val]) => (
                <span
                  key={key}
                  className={`px-2 py-1 rounded ${val ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-slate-600'}`}
                >
                  {key}: {val || '—'}
                </span>
              ))}
            </div>
          </div>

          {/* Sample Results */}
          {result.sample_results && result.sample_results.length > 0 && (
            <div className="bg-card-dark rounded-xl border border-aged-gold/10 p-4">
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <span className="material-icons-round text-primary text-sm">preview</span>
                Örnek Sonuçlar
              </h3>
              <div className="space-y-2">
                {result.sample_results.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-white font-medium text-sm">{s.match}</p>
                      <p className="text-slate-400 text-xs">{s.rules} kural | 4-5: {s.odds_45}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-bold text-sm">{s.prediction}</p>
                      <p className="text-slate-400 text-xs">%{s.confidence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped Details */}
          {result.skipped > 0 && result.skipped_details && (
            <div className="bg-card-dark rounded-xl border border-aged-gold/10 p-4">
              <h3 className="text-yellow-400 font-bold text-sm mb-2 flex items-center gap-2">
                <span className="material-icons-round text-yellow-400 text-sm">warning</span>
                Atlanan Satırlar ({result.skipped})
              </h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {result.skipped_details.map((s, i) => (
                  <p key={i} className="text-xs text-slate-400">
                    Satır {s.row}: <span className="text-slate-300">{s.reason}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {result.inserted > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
              <span className="material-icons-round text-green-400 text-3xl mb-2 block">task_alt</span>
              <p className="text-green-400 font-bold text-lg">{result.inserted} Tahmin Başarıyla Eklendi!</p>
              <p className="text-slate-400 text-sm mt-1">Dashboard otomatik olarak güncellenecek</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
