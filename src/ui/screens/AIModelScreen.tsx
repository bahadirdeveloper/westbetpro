import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function AIModelScreen() {
  const rules = [
    { id: 1, name: 'Erken Baskı Paradigması', desc: 'İlk 15dk Topla Oynama > %65', accuracy: 92.4, featured: false },
    { id: 2, name: "Şerif'in Gözü (Sheriff's Eye)", desc: 'Defansif Formasyon Analizi', accuracy: 88.1, featured: false },
    { id: 3, name: 'Altın Tabanca Stratejisi', desc: 'Yüksek ROI - Son Dakika Golleri', accuracy: 94.7, featured: true },
    { id: 4, name: 'Sakin Batı Durgunluğu', desc: 'İy 0.5 Alt Tahminleme', accuracy: 81.2, featured: false },
  ];

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="ai-model" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Yapay Zeka Motoru: Aktif" searchPlaceholder="Kural veya parametre ara..." />

        <section className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-western text-white mb-2 tracking-wide">AI Model Detay ve Kurallar</h2>
            <p className="text-slate-400">Model fabrikamız tarafından işlenen 26 aktif uzman kural ve isabet oranları.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="xl:col-span-2 space-y-8">
              {/* Accuracy Chart */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-western text-2xl text-white">Kural İsabet Grafiği</h3>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Son 7 Günlük Model Kararlılığı</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">trending_up</span> %94.2 Ortalama
                    </span>
                  </div>
                </div>
                <div className="h-64 relative flex items-end gap-3 px-2">
                  {[82, 88, 75, 92, 85, 96, 78].map((height, i) => (
                    <div
                      key={i}
                      className={`flex-1 ${i === 3 ? 'bg-primary/40 border-t-2 border-primary' : i === 5 ? 'bg-primary shadow-[0_0_20px_rgba(0,255,102,0.2)]' : 'bg-primary/10'} hover:bg-primary/40 transition-all rounded-t-lg relative group`}
                      style={{ height: `${height}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold hidden group-hover:block">{height}%</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 px-2 text-[10px] font-bold text-slate-500 uppercase">
                  <span>Pazartesi</span>
                  <span>Salı</span>
                  <span>Çarşamba</span>
                  <span>Perşembe</span>
                  <span>Cuma</span>
                  <span>Cumartesi</span>
                  <span>Pazar</span>
                </div>
              </div>

              {/* Rules List */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-aged-gold">list_alt</span>
                    <h3 className="font-western text-xl text-white">26 Uzman Kural Listesi</h3>
                  </div>
                  <button className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest flex items-center gap-1">
                    Hepsini Gör <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition-all ${rule.featured ? 'bg-primary/5 border border-primary/20' : 'bg-white/5 border border-white/5'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${rule.featured ? 'bg-primary text-black' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                          {rule.featured ? (
                            <span className="material-symbols-outlined text-xl">workspace_premium</span>
                          ) : (
                            <span className="font-western text-lg">{String(rule.id).padStart(2, '0')}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{rule.name}</h4>
                          <p className="text-[10px] text-slate-500 uppercase">{rule.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs font-bold text-primary neon-glow">%{rule.accuracy}</p>
                          <p className="text-[9px] text-slate-500 uppercase">İsabet</p>
                        </div>
                        <span className={`material-symbols-outlined ${rule.featured ? 'text-primary' : 'text-aged-gold/40'}`}>
                          {rule.featured ? 'verified' : 'settings'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-center">
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Ve 22 Diğer Kural Yükleniyor...</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Rule Approval Pool */}
              <div className="bg-card-dark rounded-2xl border-2 border-primary/30 p-6 relative overflow-hidden group">
                <div className="absolute -top-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[120px] text-primary">policy</span>
                </div>
                <div className="flex items-center gap-2 mb-4 relative">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                  <h4 className="font-western text-lg text-white">Kural Onay Havuzu</h4>
                </div>
                <div className="space-y-4 relative">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded font-bold uppercase">Yeni Model</span>
                      <span className="text-xs">🔫</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Dinamik xG Adaptasyonu</p>
                    <p className="text-[11px] text-slate-400 mb-4 italic">"Yapay zeka, Serie A için yeni bir gol beklentisi örüntüsü yakaladı."</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-primary text-black text-[10px] font-bold rounded uppercase hover:bg-opacity-80 transition-all">Onayla</button>
                      <button className="flex-1 py-2 bg-white/10 text-white text-[10px] font-bold rounded uppercase hover:bg-white/20 transition-all">Reddet</button>
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] px-2 py-0.5 bg-aged-gold/20 text-aged-gold rounded font-bold uppercase">Modifikasyon</span>
                      <span className="text-xs">🌵</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">Korner İstatistiği v2.1</p>
                    <p className="text-[11px] text-slate-400 mb-4 italic">"Premier Lig korner bahislerinde %4'lük iyileştirme teklifi."</p>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 bg-primary text-black text-[10px] font-bold rounded uppercase hover:bg-opacity-80 transition-all">İncele</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expert Note */}
              <div className="bg-gunmetal rounded-2xl border border-aged-gold/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-aged-gold/20 rounded-full">
                    <span className="material-symbols-outlined text-aged-gold">workspace_premium</span>
                  </div>
                  <h4 className="font-bold text-sm uppercase tracking-widest text-white">Uzman Notu</h4>
                </div>
                <p className="text-slate-400 text-sm italic mb-4 leading-relaxed">
                  "Bak evlat, kurallarımız sadece sayılardan ibaret değil. Her kural, Vahşi Batı'daki binlerce maçın tozlu toprağından süzülerek geldi. Neon yeşili parlıyorsa, o kurala güvenebilirsin."
                </p>
                <div className="flex items-center gap-3 border-t border-white/5 pt-4">
                  <img
                    alt="Sheriff"
                    className="w-10 h-10 rounded-full border-2 border-aged-gold shadow-lg"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWJiOK3ZMTMgoGv79hI1ibpEmgNdE05ewC4Ot7GfPsApY5zJhm6HSQxfsmg3q5dl9rrqrHNOPUdx8x3g5g9gTTNnMOMk1ha3nSzc1jkV_xblIjxOAn1ymDh6wrOB3mSk396N6bHBn2fL6nDZR76JYaCWH9KWYP6xWnUfyuimXCLnKuUPpYlfx8bpeMq7dgvLEgtvaS4zXQrQduoy3iZ2CGwdMyirLHU4Iay5di_eXRaLlUpmJfJB_-nmK6iLb_UrKclCy-fHSsrdZm"
                  />
                  <div>
                    <p className="text-xs font-bold text-white uppercase">Şerif Analizcisi</p>
                    <p className="text-[10px] text-aged-gold">Model Baş Mimarı</p>
                  </div>
                </div>
              </div>

              {/* System Logs */}
              <div className="bg-saddle-brown/10 rounded-2xl border border-saddle-brown/30 p-6">
                <h4 className="font-bold text-sm uppercase tracking-widest text-saddle-brown mb-2">Sistem Logları</h4>
                <p className="text-[11px] text-slate-400 mb-4 uppercase tracking-tighter">Son Güncelleme: 4 Dakika Önce</p>
                <button className="w-full py-2 bg-saddle-brown text-white text-xs font-bold rounded-lg uppercase tracking-widest hover:brightness-110 transition-all">Teknik Destek</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MobileNav activeTab="ai-model" />
    </div>
  );
}
