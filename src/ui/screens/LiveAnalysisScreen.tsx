import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function LiveAnalysisScreen() {
  return (
    <div className="bg-gunmetal-dark text-slate-100 font-display min-h-screen western-pattern">
      <Sidebar activeTab="canli-analiz" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Av Sahası Canlı" searchPlaceholder="Maç veya lig ara..." />

        <section className="p-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-4xl font-western text-white mb-2 tracking-wide uppercase">Canlı Av Sahası 🌵</h2>
              <p className="text-slate-400">Şu anda yapay zekanın radarındaki sıcak düellolar.</p>
            </div>
            <div className="flex gap-2">
              <div className="flex bg-gunmetal p-1 rounded-lg border border-white/5">
                <button className="px-6 py-2 rounded-md bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                  Aktif Maçlar
                </button>
                <button className="px-6 py-2 rounded-md text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-wider">
                  Bekleyenler
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Live Matches */}
            <div className="xl:col-span-3 space-y-4">
              {/* Featured Match 1 */}
              <div className="bg-gunmetal border-l-4 border-l-aged-gold border-r border-t border-b border-white/5 rounded-r-xl p-5 hover:bg-gunmetal/80 transition-all relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-9xl">stars</span>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <span className="text-2xl font-bold text-primary neon-text-glow">64'</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">2. Yarı</span>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <div className="text-right">
                      <h4 className="text-lg font-bold text-white">Fenerbahçe</h4>
                      <p className="text-[10px] text-slate-500">Süper Lig</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 px-4 py-2 bg-black/30 rounded-xl border border-white/5">
                      <span className="text-3xl font-western text-primary">2</span>
                      <span className="text-slate-600 font-bold">-</span>
                      <span className="text-3xl font-western text-primary">1</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-lg font-bold text-white">Galatasaray</h4>
                      <p className="text-[10px] text-slate-500">Süper Lig</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-aged-gold text-lg fill-1">stars</span>
                      <span className="text-xs font-bold text-aged-gold uppercase tracking-widest">Altın Oran</span>
                    </div>
                    <div className="bg-primary/10 px-3 py-1 rounded border border-primary/20">
                      <span className="text-primary text-xs font-bold uppercase">AI: KG VAR 🔥</span>
                    </div>
                  </div>
                  <button className="bg-aged-gold text-black px-4 py-2 rounded font-bold text-xs uppercase hover:bg-white transition-colors">
                    İzle 🔫
                  </button>
                </div>
              </div>

              {/* Regular Match 1 */}
              <div className="bg-gunmetal border border-white/5 rounded-xl p-5 hover:bg-gunmetal/80 transition-all group">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <span className="text-2xl font-bold text-primary neon-text-glow">22'</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">1. Yarı</span>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <div className="text-right">
                      <h4 className="text-lg font-bold text-white">Arsenal</h4>
                      <p className="text-[10px] text-slate-500">Premier Lig</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 px-4 py-2 bg-black/30 rounded-xl border border-white/5">
                      <span className="text-3xl font-western text-primary">0</span>
                      <span className="text-slate-600 font-bold">-</span>
                      <span className="text-3xl font-western text-primary">0</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-lg font-bold text-white">Man City</h4>
                      <p className="text-[10px] text-slate-500">Premier Lig</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[150px]">
                    <div className="bg-white/5 px-3 py-1 rounded border border-white/10">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">AI: 1.5 ÜST</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-primary">%88 Güven</span>
                    </div>
                  </div>
                  <button className="bg-gunmetal-dark border border-white/10 text-white px-4 py-2 rounded font-bold text-xs uppercase hover:bg-white/10 transition-colors">
                    İzle 🐎
                  </button>
                </div>
              </div>

              {/* Regular Match 2 */}
              <div className="bg-gunmetal border border-white/5 rounded-xl p-5 hover:bg-gunmetal/80 transition-all group">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <span className="text-2xl font-bold text-primary neon-text-glow">12'</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">1. Yarı</span>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <div className="text-right">
                      <h4 className="text-lg font-bold text-white">Real Madrid</h4>
                      <p className="text-[10px] text-slate-500">La Liga</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 px-4 py-2 bg-black/30 rounded-xl border border-white/5">
                      <span className="text-3xl font-western text-primary">1</span>
                      <span className="text-slate-600 font-bold">-</span>
                      <span className="text-3xl font-western text-primary">0</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-lg font-bold text-white">Villarreal</h4>
                      <p className="text-[10px] text-slate-500">La Liga</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[150px]">
                    <div className="bg-white/5 px-3 py-1 rounded border border-white/10">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">AI: MS 1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-primary">%92 Güven</span>
                    </div>
                  </div>
                  <button className="bg-gunmetal-dark border border-white/10 text-white px-4 py-2 rounded font-bold text-xs uppercase hover:bg-white/10 transition-colors">
                    İzle 🤠
                  </button>
                </div>
              </div>

              {/* Featured Match 2 */}
              <div className="bg-gunmetal border-l-4 border-l-aged-gold border-r border-t border-b border-white/5 rounded-r-xl p-5 hover:bg-gunmetal/80 transition-all relative overflow-hidden group">
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                  <div className="flex flex-col items-center justify-center min-w-[80px]">
                    <span className="text-2xl font-bold text-primary neon-text-glow">HT</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Devre Arası</span>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    <div className="text-right">
                      <h4 className="text-lg font-bold text-white">AC Milan</h4>
                      <p className="text-[10px] text-slate-500">Serie A</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 px-4 py-2 bg-black/30 rounded-xl border border-white/5">
                      <span className="text-3xl font-western text-primary">0</span>
                      <span className="text-slate-600 font-bold">-</span>
                      <span className="text-3xl font-western text-primary">2</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-lg font-bold text-white">Inter</h4>
                      <p className="text-[10px] text-slate-500">Serie A</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-aged-gold text-lg">stars</span>
                      <span className="text-xs font-bold text-aged-gold uppercase tracking-widest text-right">
                        Altın Oran
                      </span>
                    </div>
                    <div className="bg-primary/10 px-3 py-1 rounded border border-primary/20">
                      <span className="text-primary text-xs font-bold uppercase">AI: 3.5 ALT 🛡️</span>
                    </div>
                  </div>
                  <button className="bg-aged-gold text-black px-4 py-2 rounded font-bold text-xs uppercase hover:bg-white transition-colors">
                    İzle 🧨
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Sheriff's Note */}
              <div className="bg-gunmetal rounded-2xl border border-aged-gold/30 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <span className="material-symbols-outlined text-4xl text-aged-gold">assignment</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-aged-gold fill-1">workspace_premium</span>
                  <h4 className="font-bold text-sm uppercase tracking-widest text-white">Şerifin Notu 📜</h4>
                </div>
                <p className="text-slate-300 text-sm italic mb-6 leading-relaxed">
                  "Kovboy, bugünkü Av Sahası'nda rüzgar ev sahiplerinden yana esiyor. Altın oranlı düellolarda
                  mermini boşa harcama, AI verileri %85 üstü güven veriyor. City maçında tempo yüksek, kartlara
                  dikkat!"
                </p>
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl">
                  <img
                    alt="Sheriff"
                    className="w-10 h-10 rounded-full border border-aged-gold"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWJiOK3ZMTMgoGv79hI1ibpEmgNdE05ewC4Ot7GfPsApY5zJhm6HSQxfsmg3q5dl9rrqrHNOPUdx8x3g5g9gTTNnMOMk1ha3nSzc1jkV_xblIjxOAn1ymDh6wrOB3mSk396N6bHBn2fL6nDZR76JYaCWH9KWYP6xWnUfyuimXCLnKuUPpYlfx8bpeMq7dgvLEgtvaS4zXQrQduoy3iZ2CGwdMyirLHU4Iay5di_eXRaLlUpmJfJB_-nmK6iLb_UrKclCy-fHSsrdZm"
                  />
                  <div>
                    <span className="block text-xs font-bold text-aged-gold uppercase">Baş Analist Şerif</span>
                    <span className="block text-[10px] text-slate-500">Vahşi Batı Ekibi</span>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-saddle-brown/10 rounded-2xl border border-saddle-brown/30 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-saddle-brown/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-saddle-brown">support_agent</span>
                  </div>
                  <h4 className="font-bold text-sm uppercase tracking-widest text-saddle-brown">Hızlı Destek</h4>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  Bir sorunuz mu var? Şeriflerimize hemen telgraf çekin, anında yanıt alın.
                </p>
                <button className="w-full py-3 bg-saddle-brown hover:bg-saddle-brown/80 text-white text-xs font-bold rounded-lg uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">chat</span>
                  CANLI DESTEK 🌵
                </button>
              </div>

              {/* Quick Stats */}
              <div className="bg-gunmetal rounded-2xl border border-white/5 p-6">
                <h4 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-4">
                  Anlık İstatistikler
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Takip Edilen Maç</span>
                    <span className="text-xs font-bold text-primary">42</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full">
                    <div
                      className="bg-primary h-full rounded-full shadow-[0_0_8px_#00FF66]"
                      style={{ width: '75%' }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Yüksek Güvenli Oran</span>
                    <span className="text-xs font-bold text-aged-gold">12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MobileNav activeTab="canli-analiz" />
    </div>
  );
}
