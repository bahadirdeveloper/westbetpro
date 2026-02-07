'use client';

import { useEffect, useState } from 'react';

interface GoldenRule {
  id: string;
  rule_id: number;
  name: string;
  primary_odds: Record<string, number>;
  secondary_odds: Record<string, number> | null;
  exclude_odds: Record<string, number> | null;
  predictions: string[];
  confidence_base: number;
  importance: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function RulePerformanceScreen() {
  const [rules, setRules] = useState<GoldenRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // Modal states
  const [editingRule, setEditingRule] = useState<GoldenRule | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [importanceFilter, setImportanceFilter] = useState<string>('all');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    rule_id: 0,
    name: '',
    primary_odds: '{}',
    secondary_odds: '',
    exclude_odds: '',
    predictions: '',
    confidence_base: 85,
    importance: 'normal',
    notes: '',
    is_active: true,
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchRules = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/golden-rules', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error('API hatasi');
      }

      const data = await res.json();

      if (data.table_missing) {
        setTableMissing(true);
        setRules([]);
      } else {
        setTableMissing(false);
        setRules(data.rules || []);
      }
    } catch (err: any) {
      setError(err.message || 'Kurallar yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupTable = async () => {
    setSetupLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/setup-golden-rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchRules();
      } else {
        alert('Kurulum hatasi: ' + (data.message || data.error));
      }
    } catch (err: any) {
      alert('Kurulum hatasi: ' + err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // Open add modal
  const handleAdd = () => {
    const maxRuleId = rules.length > 0
      ? Math.max(...rules.map(r => r.rule_id)) + 1
      : 1;

    setFormData({
      rule_id: maxRuleId,
      name: '',
      primary_odds: '{"4-5": 0}',
      secondary_odds: '',
      exclude_odds: '',
      predictions: '',
      confidence_base: 85,
      importance: 'normal',
      notes: '',
      is_active: true,
    });
    setIsAddMode(true);
    setEditingRule(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = (rule: GoldenRule) => {
    setFormData({
      rule_id: rule.rule_id,
      name: rule.name,
      primary_odds: JSON.stringify(rule.primary_odds || {}),
      secondary_odds: rule.secondary_odds ? JSON.stringify(rule.secondary_odds) : '',
      exclude_odds: rule.exclude_odds ? JSON.stringify(rule.exclude_odds) : '',
      predictions: (rule.predictions || []).join(', '),
      confidence_base: rule.confidence_base,
      importance: rule.importance,
      notes: rule.notes || '',
      is_active: rule.is_active,
    });
    setIsAddMode(false);
    setEditingRule(rule);
    setShowModal(true);
  };

  // Save rule (create or update)
  const handleSave = async () => {
    setSaving(true);
    try {
      // Parse JSON fields
      let primaryOdds, secondaryOdds, excludeOdds;
      try {
        primaryOdds = JSON.parse(formData.primary_odds);
      } catch {
        alert('Primary odds JSON formati hatali!');
        setSaving(false);
        return;
      }
      try {
        secondaryOdds = formData.secondary_odds ? JSON.parse(formData.secondary_odds) : null;
      } catch {
        alert('Secondary odds JSON formati hatali!');
        setSaving(false);
        return;
      }
      try {
        excludeOdds = formData.exclude_odds ? JSON.parse(formData.exclude_odds) : null;
      } catch {
        alert('Exclude odds JSON formati hatali!');
        setSaving(false);
        return;
      }

      const predictions = formData.predictions
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const rulePayload: any = {
        rule_id: formData.rule_id,
        name: formData.name,
        primary_odds: primaryOdds,
        secondary_odds: secondaryOdds,
        exclude_odds: excludeOdds,
        predictions,
        confidence_base: formData.confidence_base,
        importance: formData.importance,
        notes: formData.notes,
        is_active: formData.is_active,
      };

      if (!isAddMode && editingRule) {
        rulePayload.id = editingRule.id;
      }

      const method = isAddMode ? 'POST' : 'PUT';
      const res = await fetch('/api/admin/golden-rules', {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(rulePayload),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchRules();
      } else {
        alert('Kaydetme hatasi: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch (err: any) {
      alert('Kaydetme hatasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete rule
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/golden-rules?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (data.success) {
        setDeleteConfirm(null);
        fetchRules();
      } else {
        alert('Silme hatasi: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch (err: any) {
      alert('Silme hatasi: ' + err.message);
    }
  };

  // Filtered rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch = searchQuery === '' ||
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.predictions.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesImportance = importanceFilter === 'all' || rule.importance === importanceFilter;
    return matchesSearch && matchesImportance;
  });

  // Stats
  const stats = {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    onemli: rules.filter(r => r.importance === 'önemli').length,
    high_confidence: rules.filter(r => r.confidence_base >= 90).length,
  };

  const formatOdds = (odds: Record<string, number> | null): string => {
    if (!odds) return '-';
    return Object.entries(odds)
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'önemli':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Onemli</span>;
      case 'özel':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">Ozel</span>;
      case 'çok_önemli':
        return <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">Cok Onemli</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-slate-500/20 text-slate-400 border border-slate-500/30">Normal</span>;
    }
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-slate-400">Kurallar yukleniyor...</p>
        </div>
      </div>
    );
  }

  // Table doesn't exist yet
  if (tableMissing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-western text-3xl text-aged-gold mb-2">ALTIN KURALLAR</h1>
          <p className="text-slate-400">Golden Rules yonetimi ve duzenlemesi</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 sm:p-8 text-center">
          <span className="material-icons-round text-yellow-400 text-5xl mb-4 block">build</span>
          <h3 className="text-xl font-bold text-white mb-2">Veritabani Kurulumu Gerekli</h3>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Altin kurallar tablosu henuz olusturulmamis. Supabase Dashboard'tan SQL Editor'e gidip asagidaki SQL'i calistirmaniz gerekiyor:
          </p>
          <div className="bg-black/50 rounded-lg p-4 text-left text-sm font-mono text-green-400 mb-6 max-w-2xl mx-auto overflow-x-auto">
            <pre>{`CREATE TABLE public.golden_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  primary_odds JSONB NOT NULL DEFAULT '{}',
  secondary_odds JSONB,
  exclude_odds JSONB,
  predictions TEXT[] NOT NULL DEFAULT '{}',
  confidence_base INTEGER NOT NULL DEFAULT 85,
  importance TEXT NOT NULL DEFAULT 'normal',
  notes TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.golden_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access"
  ON public.golden_rules FOR ALL
  USING (true)
  WITH CHECK (true);`}</pre>
          </div>
          <p className="text-slate-500 text-sm mb-4">
            SQL'i calistirdiktan sonra asagidaki butona basarak 49 kurali otomatik yukleyebilirsiniz:
          </p>
          <button
            onClick={handleSetupTable}
            disabled={setupLoading}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            {setupLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                Kuruluyor...
              </span>
            ) : (
              'Kurallari Yukle (49 Kural)'
            )}
          </button>
          <button
            onClick={fetchRules}
            className="ml-4 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Tekrar Kontrol Et
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-western text-3xl text-aged-gold mb-2">ALTIN KURALLAR</h1>
          <p className="text-slate-400">Golden Rules yonetimi - {rules.length} kural</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRules}
            className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <span className="material-icons-round text-sm">refresh</span>
            Yenile
          </button>
          <button
            onClick={handleAdd}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <span className="material-icons-round text-sm">add</span>
            Yeni Kural Ekle
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card-dark border border-primary/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Toplam Kural</p>
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
            </div>
            <span className="material-icons-round text-primary text-3xl">rule</span>
          </div>
        </div>

        <div className="bg-card-dark border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Aktif</p>
              <p className="text-2xl font-bold text-green-400">{stats.active}</p>
            </div>
            <span className="material-icons-round text-green-400 text-3xl">check_circle</span>
          </div>
        </div>

        <div className="bg-card-dark border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Onemli Kurallar</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.onemli}</p>
            </div>
            <span className="material-icons-round text-yellow-400 text-3xl">star</span>
          </div>
        </div>

        <div className="bg-card-dark border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Guven ≥90%</p>
              <p className="text-2xl font-bold text-blue-400">{stats.high_confidence}</p>
            </div>
            <span className="material-icons-round text-blue-400 text-3xl">trending_up</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kural adi veya tahmin ara..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>
          <select
            value={importanceFilter}
            onChange={(e) => setImportanceFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm"
          >
            <option value="all">Tum Onem Seviyeleri</option>
            <option value="önemli">Onemli</option>
            <option value="özel">Ozel</option>
            <option value="normal">Normal</option>
          </select>
          <div className="text-sm text-slate-400">
            {filteredRules.length} / {rules.length} kural
          </div>
        </div>
      </div>

      {/* Rules List */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {filteredRules.length === 0 ? (
          <div className="bg-card-dark border border-aged-gold/20 rounded-xl p-12 text-center">
            <span className="material-icons-round text-slate-600 text-5xl mb-4 block">search_off</span>
            <p className="text-slate-400">Filtrelere uygun kural bulunamadi</p>
          </div>
        ) : (
          filteredRules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-card-dark border rounded-xl overflow-hidden transition-all ${
                !rule.is_active ? 'border-slate-700/30 opacity-60' : 'border-aged-gold/20 hover:border-aged-gold/40'
              }`}
            >
              {/* Rule Header - always visible */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">#{rule.rule_id}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-white truncate">{rule.name}</h3>
                      {getImportanceBadge(rule.importance)}
                      {!rule.is_active && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">Pasif</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">
                        Guven: <span className={`font-medium ${rule.confidence_base >= 90 ? 'text-green-400' : 'text-blue-400'}`}>{rule.confidence_base}%</span>
                      </span>
                      <span className="text-xs text-slate-500">|</span>
                      <span className="text-xs text-slate-400">
                        Oran: {formatOdds(rule.primary_odds)}
                      </span>
                      <span className="text-xs text-slate-500">|</span>
                      <span className="text-xs text-slate-400">
                        {rule.predictions.length} tahmin
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(rule); }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Duzenle"
                  >
                    <span className="material-icons-round text-slate-400 text-sm">edit</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(rule.id); }}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <span className="material-icons-round text-red-400 text-sm">delete</span>
                  </button>
                  <span className={`material-icons-round text-slate-400 text-sm transition-transform ${expandedRule === rule.id ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedRule === rule.id && (
                <div className="border-t border-white/5 p-4 bg-white/[0.02]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Predictions */}
                    <div>
                      <p className="text-xs text-slate-400 mb-2 font-medium">Tahminler:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rule.predictions.map((pred, idx) => (
                          <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs border border-primary/20">
                            {pred}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Odds Details */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-slate-400 mb-1 font-medium">Ana Oran:</p>
                        <p className="text-sm text-white font-mono">{JSON.stringify(rule.primary_odds)}</p>
                      </div>
                      {rule.secondary_odds && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1 font-medium">Yardimci Oran:</p>
                          <p className="text-sm text-white font-mono">{JSON.stringify(rule.secondary_odds)}</p>
                        </div>
                      )}
                      {rule.exclude_odds && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1 font-medium">Haric Tutulan:</p>
                          <p className="text-sm text-red-400 font-mono">{JSON.stringify(rule.exclude_odds)}</p>
                        </div>
                      )}
                      {rule.notes && (
                        <div>
                          <p className="text-xs text-slate-400 mb-1 font-medium">Not:</p>
                          <p className="text-sm text-slate-300">{rule.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Delete confirmation */}
              {deleteConfirm === rule.id && (
                <div className="border-t border-red-500/20 p-4 bg-red-500/5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-red-400">
                      Bu kurali silmek istediginizden emin misiniz?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                      >
                        Iptal
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-card-dark border border-aged-gold/30 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card-dark border-b border-white/10 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {isAddMode ? 'Yeni Kural Ekle' : 'Kural Duzenle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="material-icons-round text-slate-400">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Rule ID & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Kural ID</label>
                  <input
                    type="number"
                    value={formData.rule_id}
                    onChange={(e) => setFormData({...formData, rule_id: parseInt(e.target.value) || 0})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Kural Adi</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="orn: 4-5 gol 2.33"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Primary Odds */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Ana Oran (JSON)
                </label>
                <input
                  type="text"
                  value={formData.primary_odds}
                  onChange={(e) => setFormData({...formData, primary_odds: e.target.value})}
                  placeholder='{"4-5": 2.33}'
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* Secondary & Exclude Odds */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Yardimci Oran (JSON, opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={formData.secondary_odds}
                    onChange={(e) => setFormData({...formData, secondary_odds: e.target.value})}
                    placeholder='{"2,5 Ü": 1.23}'
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Haric Oran (JSON, opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={formData.exclude_odds}
                    onChange={(e) => setFormData({...formData, exclude_odds: e.target.value})}
                    placeholder='{"VAR": 1.50}'
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Predictions */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Tahminler (virgullerle ayirin)
                </label>
                <textarea
                  value={formData.predictions}
                  onChange={(e) => setFormData({...formData, predictions: e.target.value})}
                  placeholder="IY 0.5 UST, MS 2.5 UST, KG VAR"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>

              {/* Confidence, Importance, Active */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Guven Skoru (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={formData.confidence_base}
                    onChange={(e) => setFormData({...formData, confidence_base: parseInt(e.target.value) || 85})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Onem Seviyesi</label>
                  <select
                    value={formData.importance}
                    onChange={(e) => setFormData({...formData, importance: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="önemli">Onemli</option>
                    <option value="özel">Ozel</option>
                    <option value="çok_önemli">Cok Onemli</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Durum</label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({...formData, is_active: e.target.value === 'active'})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Notlar (opsiyonel)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Ek notlar..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-card-dark border-t border-white/10 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.primary_odds}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <span className="material-icons-round text-sm">save</span>
                    {isAddMode ? 'Ekle' : 'Kaydet'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
