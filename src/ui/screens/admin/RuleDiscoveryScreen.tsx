'use client';

import { useState } from 'react';

interface Pattern {
  pattern_id: string;
  description: string;
  prediction_type: string;
  total_matches: number;
  won: number;
  lost: number;
  success_rate: number;
  avg_confidence: number;
  sample_matches: Array<{
    match: string;
    date: string;
    league: string;
    result: string;
  }>;
  score: number;
}

interface RulePerf {
  rule_id: string;
  name: string;
  total: number;
  won: number;
  lost: number;
  success_rate: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
}

interface DiscoveryResult {
  success: boolean;
  total_analyzed: number;
  overall_success_rate: number;
  patterns: Pattern[];
  rule_performance: RulePerf[];
  source_stats: Array<{ source: string; total: number; won: number; lost: number; rate: number }>;
  confidence_stats: Array<{ range: string; total: number; won: number; lost: number; rate: number }>;
  type_stats: Array<{ type: string; total: number; won: number; lost: number; rate: number }>;
  insights: string[];
  error?: string;
}

export default function RuleDiscoveryScreen() {
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [tab, setTab] = useState<'patterns' | 'rules' | 'insights'>('insights');

  const runDiscovery = async () => {
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/engine/discover-rules', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ success: false, total_analyzed: 0, overall_success_rate: 0, patterns: [], rule_performance: [], source_stats: [], confidence_stats: [], type_stats: [], insights: [], error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400 bg-green-500/10';
      case 'good': return 'text-blue-400 bg-blue-500/10';
      case 'average': return 'text-yellow-400 bg-yellow-500/10';
      case 'poor': return 'text-red-400 bg-red-500/10';
      default: return 'text-slate-400 bg-white/5';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Mükemmel';
      case 'good': return 'İyi';
      case 'average': return 'Ortalama';
      case 'poor': return 'Zayıf';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-western text-2xl sm:text-3xl text-aged-gold mb-1 sm:mb-2">KURAL KEŞFİ</h1>
        <p className="text-slate-400">Geçmiş tahmin verilerini analiz ederek yeni kural adayları ve performans örüntüleri keşfet</p>
      </div>

      {/* Run Button */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <span className="material-icons-round text-primary">psychology</span>
              Örüntü Analizi Motoru
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Tüm sonuçlanmış tahminleri analiz eder, başarılı örüntüleri, lig/tip performansını ve kural etkinliğini raporlar.
            </p>
          </div>
          <button
            onClick={runDiscovery}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-black px-6 py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></span>
            ) : (
              <span className="material-icons-round text-sm">search</span>
            )}
            {loading ? 'Analiz Ediliyor...' : 'Keşfet'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white/5 rounded-xl p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-slate-400">Tahmin verileri analiz ediliyor, örüntüler aranıyor...</p>
        </div>
      )}

      {/* Error */}
      {result && !result.success && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-bold">Hata: {result.error}</p>
        </div>
      )}

      {/* Results */}
      {result && result.success && (
        <div className="space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-3 sm:p-4 text-center">
              <span className="material-icons-round text-primary text-lg sm:text-xl mb-1 block">query_stats</span>
              <p className="text-lg sm:text-2xl font-bold text-white">{result.total_analyzed}</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">Analiz Edilen</p>
            </div>
            <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-3 sm:p-4 text-center">
              <span className="material-icons-round text-aged-gold text-lg sm:text-xl mb-1 block">percent</span>
              <p className="text-lg sm:text-2xl font-bold text-white">%{result.overall_success_rate}</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">Genel Başarı</p>
            </div>
            <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-3 sm:p-4 text-center">
              <span className="material-icons-round text-blue-400 text-lg sm:text-xl mb-1 block">pattern</span>
              <p className="text-lg sm:text-2xl font-bold text-white">{result.patterns.length}</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">Keşfedilen Örüntü</p>
            </div>
            <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-3 sm:p-4 text-center">
              <span className="material-icons-round text-green-400 text-lg sm:text-xl mb-1 block">rule</span>
              <p className="text-lg sm:text-2xl font-bold text-white">{result.rule_performance.length}</p>
              <p className="text-slate-500 text-[10px] sm:text-xs">Aktif Kural</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            {[
              { key: 'insights', label: 'Öngörüler', icon: 'lightbulb' },
              { key: 'patterns', label: 'Örüntüler', icon: 'pattern' },
              { key: 'rules', label: 'Kural Perf.', icon: 'rule' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap flex-shrink-0 ${
                  tab === t.key
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:border-white/10'
                }`}
              >
                <span className="material-icons-round text-xs sm:text-sm">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Insights Tab */}
          {tab === 'insights' && (
            <div className="space-y-4">
              {/* AI Insights */}
              <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-5">
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                  <span className="material-icons-round text-primary text-sm">auto_awesome</span>
                  AI Öngörüleri
                </h3>
                <div className="space-y-2">
                  {result.insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/5 rounded-lg px-4 py-3">
                      <span className="material-icons-round text-aged-gold text-sm mt-0.5">
                        {insight.includes('⚠️') ? 'warning' : 'insights'}
                      </span>
                      <p className="text-sm text-slate-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Stats */}
              {result.source_stats.length > 0 && (
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-blue-400 text-sm">source</span>
                    Kaynak Performansı
                  </h3>
                  <div className="space-y-2">
                    {result.source_stats.map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                            s.source === 'api-engine' ? 'bg-blue-500/10 text-blue-400' :
                            s.source === 'excel-upload' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-white/10 text-slate-400'
                          }`}>
                            {s.source === 'api-engine' ? 'API' : s.source === 'excel-upload' ? 'EXCEL' : 'MANUEL'}
                          </span>
                          <span className="text-sm text-slate-300">{s.total} maç</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">{s.won}/{s.total}</span>
                          <span className={`text-sm font-bold ${s.rate >= 65 ? 'text-green-400' : s.rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            %{s.rate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type Stats */}
              {result.type_stats.length > 0 && (
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-aged-gold text-sm">category</span>
                    Tahmin Tipi Performansı
                  </h3>
                  <div className="space-y-2">
                    {result.type_stats.map((t, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                        <span className="text-sm text-white font-medium">{t.type}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-400">{t.won}/{t.total}</span>
                          <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${t.rate >= 65 ? 'bg-green-500' : t.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${t.rate}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold min-w-[40px] text-right ${t.rate >= 65 ? 'text-green-400' : t.rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            %{t.rate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence Stats */}
              {result.confidence_stats.length > 0 && (
                <div className="bg-card-dark border border-aged-gold/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="material-icons-round text-primary text-sm">speed</span>
                    Güven Aralığı Performansı
                  </h3>
                  <div className="space-y-2">
                    {result.confidence_stats.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                        <span className="text-sm text-white font-medium">%{c.range}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-slate-400">{c.won}/{c.total}</span>
                          <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.rate >= 65 ? 'bg-green-500' : c.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${c.rate}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold min-w-[40px] text-right ${c.rate >= 65 ? 'text-green-400' : c.rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            %{c.rate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Patterns Tab */}
          {tab === 'patterns' && (
            <div className="space-y-3">
              {result.patterns.length === 0 ? (
                <div className="bg-white/5 rounded-xl p-8 text-center">
                  <span className="material-icons-round text-3xl text-slate-600 mb-2 block">search_off</span>
                  <p className="text-slate-400">Henüz anlamlı örüntü keşfedilemedi. Daha fazla veri toplandıkça örüntüler ortaya çıkacak.</p>
                </div>
              ) : (
                result.patterns.map((p, i) => (
                  <div key={i} className="bg-card-dark border border-aged-gold/10 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedPattern(expandedPattern === p.pattern_id ? null : p.pattern_id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded font-bold ${
                          p.success_rate >= 80 ? 'bg-green-500/10 text-green-400' :
                          p.success_rate >= 65 ? 'bg-blue-500/10 text-blue-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          %{p.success_rate}
                        </span>
                        <div>
                          <p className="text-white text-sm font-medium">{p.description}</p>
                          <p className="text-slate-500 text-xs">{p.won}/{p.total_matches} kazanan</p>
                        </div>
                      </div>
                      <span className="material-icons-round text-slate-500 text-sm">
                        {expandedPattern === p.pattern_id ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                    {expandedPattern === p.pattern_id && p.sample_matches.length > 0 && (
                      <div className="border-t border-white/5 px-4 py-3 space-y-1.5">
                        <p className="text-slate-400 text-xs font-bold mb-2">Örnek Maçlar:</p>
                        {p.sample_matches.map((m, j) => (
                          <div key={j} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-white">{m.match}</p>
                              <p className="text-slate-500">{m.league} • {m.date}</p>
                            </div>
                            <span className={`font-bold ${m.result === 'Kazandı' ? 'text-green-400' : 'text-red-400'}`}>
                              {m.result}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Rules Tab */}
          {tab === 'rules' && (
            <div className="space-y-3">
              {result.rule_performance.length === 0 ? (
                <div className="bg-white/5 rounded-xl p-8 text-center">
                  <span className="material-icons-round text-3xl text-slate-600 mb-2 block">rule</span>
                  <p className="text-slate-400">Henüz kural performans verisi yok.</p>
                </div>
              ) : (
                result.rule_performance.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-card-dark border border-aged-gold/10 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-slate-600 text-xs font-mono">#{r.rule_id}</span>
                      <p className="text-white text-sm font-medium truncate">{r.name}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-slate-400">{r.won}/{r.total}</span>
                      <div className="w-16 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            r.status === 'excellent' ? 'bg-green-500' :
                            r.status === 'good' ? 'bg-blue-500' :
                            r.status === 'average' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${r.success_rate}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                      <span className={`text-sm font-bold min-w-[40px] text-right ${
                        r.success_rate >= 65 ? 'text-green-400' : r.success_rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        %{r.success_rate}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
