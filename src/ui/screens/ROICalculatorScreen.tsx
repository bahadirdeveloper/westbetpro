import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function ROICalculatorScreen() {
  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="roi-hesaplayici" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Kasa Motoru Aktif" searchPlaceholder="Araçlarda ara..." />

        <section className="p-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🏦</span>
              <h2 className="text-4xl font-western text-white tracking-wide">ROI Hesaplayıcı ve Kasa Analizi</h2>
            </div>
            <p className="text-slate-400">Yatırımınızın getirisini ve risk dengenizi profesyonel şerif araçlarıyla hesaplayın.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Calculator Form */}
            <div className="xl:col-span-5 space-y-6">
              <div className="bg-gunmetal border border-aged-gold/20 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <span className="text-6xl">💰</span>
                </div>
                <h3 className="font-western text-aged-gold text-lg mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">payments</span>
                  Parametreleri Girin
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Kasa (Mevcut Bakiye)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-aged-gold font-bold">₺</span>
                      <input
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="0.00"
                        type="number"
                        defaultValue="10000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Bahis Miktarı (Stake)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-aged-gold font-bold">₺</span>
                      <input
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="0.00"
                        type="number"
                        defaultValue="500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Oran (Odds)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-aged-gold font-bold">x</span>
                      <input
                        className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="1.00"
                        step="0.01"
                        type="number"
                        defaultValue="1.85"
                      />
                    </div>
                  </div>
                  <button className="w-full bg-saddle-brown hover:bg-saddle-brown/80 text-white font-western text-xl py-5 rounded-xl shadow-lg shadow-saddle-brown/20 transition-all flex items-center justify-center gap-3 group">
                    <span className="material-symbols-outlined group-hover:rotate-45 transition-transform">bolt</span>
                    HESAPLA
                  </button>
                </div>
              </div>
              <div className="bg-card-dark border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <span className="text-2xl">✨</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Altın İpucu</h4>
                  <p className="text-xs text-slate-400 italic">"Kasanızın %5'inden fazlasını tek bir düelloya sürmeyin, kovboy."</p>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="xl:col-span-7 space-y-6">
              <div className="bg-gunmetal border-2 border-primary/20 p-8 rounded-3xl relative overflow-hidden h-full flex flex-col">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="font-western text-primary text-2xl tracking-widest uppercase mb-1">ANALİZ SONUCU</h3>
                    <p className="text-slate-500 text-sm">Seçilen verilere göre beklenen projeksiyon.</p>
                  </div>
                  <span className="text-4xl">🟡</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="p-6 bg-black/30 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Net Kar Beklentisi</p>
                    <h4 className="text-5xl font-western text-primary neon-glow">₺425.00</h4>
                    <p className="text-xs text-primary/60 mt-2 font-bold uppercase">+4.25% Kasa Büyümesi</p>
                  </div>
                  <div className="p-6 bg-black/30 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Olası ROI</p>
                    <h4 className="text-5xl font-western text-primary neon-glow">%85</h4>
                    <p className="text-xs text-primary/60 mt-2 font-bold uppercase">Yüksek Verimlilik</p>
                  </div>
                </div>
                <div className="mt-auto relative pb-12">
                  <div className="flex flex-col items-center">
                    <div className="relative w-full max-w-sm h-48">
                      <svg className="w-full h-full" viewBox="0 0 100 50">
                        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="transparent" stroke="#1A1F1C" strokeLinecap="round" strokeWidth="8" />
                        <path className="opacity-50" d="M 10 50 A 40 40 0 0 1 90 50" fill="transparent" stroke="#00FF66" strokeDasharray="125.6" strokeDashoffset="30" strokeLinecap="round" strokeWidth="8" />
                        <circle cx="50" cy="50" fill="#C5A059" r="4" />
                        <line stroke="#C5A059" strokeLinecap="round" strokeWidth="2" x1="50" x2="20" y1="50" y2="25" />
                      </svg>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                        <p className="text-[10px] font-bold text-aged-gold uppercase tracking-[0.3em]">Kazanç Potansiyeli</p>
                        <span className="text-2xl font-western text-white">TEHLİKELİ</span>
                      </div>
                    </div>
                    <div className="flex w-full justify-between max-w-sm px-4 text-[10px] font-bold text-slate-600">
                      <span>MUHAFAZAKAR</span>
                      <span>AGRESİF</span>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
              </div>
            </div>
          </div>

          {/* Recent Calculations Table */}
          <div className="mt-12 bg-card-dark rounded-3xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h3 className="font-western text-white text-xl">Son Hesaplamalar</h3>
              <button className="text-xs font-bold text-aged-gold hover:text-white transition-colors">TEMİZLE</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-8 py-4">Tarih</th>
                    <th className="px-8 py-4">Kasa</th>
                    <th className="px-8 py-4">Miktar</th>
                    <th className="px-8 py-4">Oran</th>
                    <th className="px-8 py-4">Potansiyel</th>
                    <th className="px-8 py-4">Durum</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-4 text-slate-400">12 Dakika Önce</td>
                    <td className="px-8 py-4 font-bold text-white">₺12,500</td>
                    <td className="px-8 py-4 text-white">₺750</td>
                    <td className="px-8 py-4 text-aged-gold font-bold">2.10</td>
                    <td className="px-8 py-4 text-primary font-bold">₺1,575</td>
                    <td className="px-8 py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider">Hesaplandı</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-4 text-slate-400">1 Saat Önce</td>
                    <td className="px-8 py-4 font-bold text-white">₺12,500</td>
                    <td className="px-8 py-4 text-white">₺200</td>
                    <td className="px-8 py-4 text-aged-gold font-bold">1.50</td>
                    <td className="px-8 py-4 text-primary font-bold">₺300</td>
                    <td className="px-8 py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider">Hesaplandı</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <MobileNav activeTab="roi-hesaplayici" />
    </div>
  );
}
