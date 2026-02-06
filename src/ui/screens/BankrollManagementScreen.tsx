import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function BankrollManagementScreen() {
  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="kasa-yonetimi" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Finansal Veriler Güncel" />

        <section className="p-8">
          {/* Page Header */}
          <div className="mb-10">
            <h2 className="text-4xl font-western text-white mb-2 tracking-wide uppercase">Kasa Yönetimi ve Strateji</h2>
            <p className="text-slate-400">Altınlarını koru, mermini boşa harcama. AI destekli büyüme projeksiyonu.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bankroll Chart */}
              <div className="bg-gunmetal border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Toplam Kasa Değeri</p>
                    <h3 className="text-3xl font-western text-primary neon-glow">$12,854.20</h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded">+18.4%</span>
                  </div>
                </div>
                <div className="h-64 w-full relative">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="neonGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor="#00FF66" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#00FF66" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      className="chart-line"
                      d="M0,80 L15,75 L30,85 L45,60 L60,40 L75,45 L90,20 L100,10"
                      fill="none"
                      stroke="#00FF66"
                      strokeWidth="2"
                    />
                    <path d="M0,80 L15,75 L30,85 L45,60 L60,40 L75,45 L90,20 L100,10 L100,100 L0,100 Z" fill="url(#neonGradient)" />
                  </svg>
                </div>
                <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  <span>Pazartesi</span>
                  <span>Salı</span>
                  <span>Çarşamba</span>
                  <span>Perşembe</span>
                  <span>Cuma</span>
                  <span>Cumartesi</span>
                  <span>Pazar</span>
                </div>
              </div>

              {/* Strategy Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card-dark border border-white/5 p-6 rounded-2xl hover:border-aged-gold/40 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">🐎</span>
                    <span className="text-[10px] font-bold text-aged-gold border border-aged-gold/30 px-2 py-1 rounded">GÜVENLİ</span>
                  </div>
                  <h4 className="font-western text-xl text-white mb-2 uppercase">Sabit Bahis (Flat)</h4>
                  <p className="text-sm text-slate-400 mb-4">
                    Her maça kasanın %2'si kadar mermi sıkarsın. Ağır ama emin adımlarla menzile ulaşırsın.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Şu an aktif
                  </div>
                </div>

                <div className="bg-card-dark border border-white/5 p-6 rounded-2xl hover:border-primary/40 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-4xl">🏇</span>
                    <span className="text-[10px] font-bold text-primary border border-primary/30 px-2 py-1 rounded">AGRESİF</span>
                  </div>
                  <h4 className="font-western text-xl text-white mb-2 uppercase">Kelly Kriteri</h4>
                  <p className="text-sm text-slate-400 mb-4">
                    Güven puanına göre mermi miktarını artır. Atı mahmuzla, riskini ve kazancını optimize et.
                  </p>
                  <button className="text-xs font-bold text-slate-500 group-hover:text-white flex items-center gap-1 transition-colors">
                    STRATEJİYE GEÇ <span className="material-symbols-outlined text-sm">trending_flat</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Sheriff's Advice */}
              <div className="bg-card-dark border-2 border-aged-gold/30 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-10">
                  <span className="material-symbols-outlined text-9xl text-aged-gold">shield</span>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <img
                    alt="Sheriff"
                    className="w-12 h-12 rounded-full border-2 border-aged-gold"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWJiOK3ZMTMgoGv79hI1ibpEmgNdE05ewC4Ot7GfPsApY5zJhm6HSQxfsmg3q5dl9rrqrHNOPUdx8x3g5g9gTTNnMOMk1ha3nSzc1jkV_xblIjxOAn1ymDh6wrOB3mSk396N6bHBn2fL6nDZR76JYaCWH9KWYP6xWnUfyuimXCLnKuUPpYlfx8bpeMq7dgvLEgtvaS4zXQrQduoy3iZ2CGwdMyirLHU4Iay5di_eXRaLlUpmJfJB_-nmK6iLb_UrKclCy-fHSsrdZm"
                  />
                  <div>
                    <h4 className="font-western text-aged-gold">Şerifin Kasa Tavsiyesi</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Günün Stratejisi</p>
                  </div>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-sm italic text-slate-300">
                      "Kovboy, bugün bülten puslu. Kasandaki mermileri %1'lik dilimlere böl. Real Madrid düellosunda
                      elini korkak alıştırma ama kasanın tamamını da bir ata yatırma."
                    </p>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-400">Önerilen Birim:</span>
                      <span className="text-sm font-bold text-primary">1.5 Ünite</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-400">Risk Seviyesi:</span>
                      <span className="text-sm font-bold text-aged-gold">ORTA-DÜŞÜK</span>
                    </div>
                  </div>
                  <button className="w-full py-3 bg-aged-gold text-black font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-yellow-600 transition-colors">
                    DETAYLI ANALİZİ AÇ
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gunmetal border border-white/5 rounded-2xl p-6">
                <h5 className="font-bold text-xs text-slate-500 uppercase tracking-widest mb-4">Hızlı İstatistikler</h5>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-400">Aylık ROI</span>
                    <span className="font-western text-lg text-primary">+24.5%</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-400">Max Kayıp (Drawdown)</span>
                    <span className="font-western text-lg text-red-500">-8.2%</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-slate-400">Ortalama Oran</span>
                    <span className="font-western text-lg text-aged-gold">1.85</span>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-saddle-brown/20 border border-saddle-brown/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-saddle-brown">help_center</span>
                  <h4 className="font-bold text-sm text-white">Yönetim Desteği</h4>
                </div>
                <p className="text-xs text-slate-400 mb-4">Kasa yönetimi ayarlarında yardıma mı ihtiyacın var?</p>
                <button className="w-full py-2 bg-saddle-brown text-white text-[10px] font-bold uppercase rounded hover:bg-opacity-80 transition-all">
                  ŞERİFE SOR
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MobileNav activeTab="kasa-yonetimi" />
    </div>
  );
}
