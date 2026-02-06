import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';

export default function HistoricalDataScreen() {
  const matches = [
    {
      date: '12.10.2023',
      match: 'Arsenal - Chelsea',
      league: 'Premier Lig',
      prediction: 'MS 1',
      odds: '1.85',
      score: '2 - 0',
      result: 'win',
    },
    {
      date: '11.10.2023',
      match: 'Real Madrid - Osasuna',
      league: 'La Liga',
      prediction: '2.5 ÜST',
      odds: '1.60',
      score: '4 - 1',
      result: 'win',
    },
    {
      date: '11.10.2023',
      match: 'Milan - Juventus',
      league: 'Serie A',
      prediction: 'KG VAR',
      odds: '1.75',
      score: '0 - 1',
      result: 'loss',
    },
    {
      date: '10.10.2023',
      match: 'Bayern - Freiburg',
      league: 'Bundesliga',
      prediction: 'MS 1 (-1)',
      odds: '1.45',
      score: '3 - 0',
      result: 'win',
    },
    {
      date: '10.10.2023',
      match: 'Luton - Spurs',
      league: 'Premier Lig',
      prediction: 'MS 2',
      odds: '1.50',
      score: '0 - 1',
      result: 'win',
    },
  ];

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <Sidebar activeTab="gecmis-veriler" />

      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Arşiv Arşivi Açık" searchPlaceholder="Arşivde ara..." />

        <section className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-western text-white mb-2 tracking-wide uppercase">Geçmiş Veriler</h2>
            <p className="text-slate-400">Tamamlanmış düelloların ve şerif raporlarının kayıt defteri.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -right-2 -top-2 opacity-10">
                <span className="material-symbols-outlined text-6xl text-primary">analytics</span>
              </div>
              <p className="text-slate-500 text-xs mb-1 uppercase tracking-widest font-bold">Genel ROI</p>
              <h3 className="text-3xl font-western text-primary neon-glow">+24.8%</h3>
            </div>

            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -right-2 -top-2 opacity-10">
                <span className="material-symbols-outlined text-6xl text-aged-gold">check_circle</span>
              </div>
              <p className="text-slate-500 text-xs mb-1 uppercase tracking-widest font-bold">Toplam Başarı</p>
              <h3 className="text-3xl font-western text-white">1,402 / 1,850</h3>
            </div>

            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -right-2 -top-2 opacity-10">
                <span className="material-symbols-outlined text-6xl text-saddle-brown">payments</span>
              </div>
              <p className="text-slate-500 text-xs mb-1 uppercase tracking-widest font-bold">Net Kazanç</p>
              <h3 className="text-3xl font-western text-white">₺84,250</h3>
            </div>

            <div className="bg-card-dark p-6 rounded-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute -right-2 -top-2 opacity-10">
                <span className="material-symbols-outlined text-6xl text-rust-red">dangerous</span>
              </div>
              <p className="text-slate-500 text-xs mb-1 uppercase tracking-widest font-bold">Max Kayıp Serisi</p>
              <h3 className="text-3xl font-western text-rust-red">3</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Table */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-card-dark border border-white/5 rounded-2xl p-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <select className="bg-background-dark border-white/10 rounded-lg text-sm text-slate-300 focus:ring-primary">
                      <option>Tüm Ligler</option>
                      <option>Premier Lig</option>
                      <option>La Liga</option>
                    </select>
                    <select className="bg-background-dark border-white/10 rounded-lg text-sm text-slate-300 focus:ring-primary">
                      <option>Son 30 Gün</option>
                      <option>Son 90 Gün</option>
                      <option>Tüm Zamanlar</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-primary/20 transition-all">
                      Excel Çıktısı
                    </button>
                    <button className="bg-white/5 text-slate-400 border border-white/10 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:text-white transition-all">
                      Filtrele
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Tarih
                        </th>
                        <th className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Karşılaşma
                        </th>
                        <th className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Tahmin
                        </th>
                        <th className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Oran
                        </th>
                        <th className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Skor
                        </th>
                        <th className="py-4 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Sonuç
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {matches.map((match, i) => (
                        <tr key={i} className="data-table-row transition-colors group">
                          <td className="py-4 px-4 text-xs text-slate-400">{match.date}</td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{match.match}</span>
                              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                {match.league}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs font-bold text-primary">{match.prediction}</td>
                          <td className="py-4 px-4 text-xs font-mono">{match.odds}</td>
                          <td className="py-4 px-4 text-xs font-bold">{match.score}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  match.result === 'win'
                                    ? 'bg-primary shadow-[0_0_8px_rgba(0,255,102,0.6)]'
                                    : 'bg-rust-red shadow-[0_0_8px_rgba(178,34,34,0.6)]'
                                }`}
                              ></span>
                              <span
                                className={`text-xs font-bold uppercase ${
                                  match.result === 'win' ? 'text-primary' : 'text-rust-red'
                                }`}
                              >
                                {match.result === 'win' ? 'KAZANDI 💰' : 'KAYIP'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-6">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sayfa 1 / 156</p>
                  <div className="flex gap-2">
                    <button className="p-2 border border-white/10 rounded hover:bg-white/5 transition-all">
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button className="p-2 border border-white/10 rounded hover:bg-white/5 transition-all bg-white/5">
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Analyst Summary */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <span className="material-symbols-outlined text-aged-gold">history</span>
                  <h4 className="font-bold text-sm uppercase tracking-widest text-white">Analist Özeti</h4>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-background-dark/50 rounded-xl border border-white/5">
                    <p className="text-[10px] font-bold text-primary uppercase mb-2">Haftalık Rapor</p>
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                      "Geçtiğimiz hafta ev sahibi takımların üstünlüğü istatistiklerimize net yansıdı. ROI oranımız
                      %15 beklentisini aşarak %24'e ulaştı."
                    </p>
                  </div>
                  <div className="p-4 bg-background-dark/50 rounded-xl border border-white/5">
                    <p className="text-[10px] font-bold text-aged-gold uppercase mb-2">Sıcak Trendler</p>
                    <ul className="text-[10px] space-y-2 text-slate-300">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-aged-gold"></span>
                        Premier Lig KG Var: %82 İsabet
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-aged-gold"></span>
                        La Liga MS 1: %65 Başarı
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <img
                      alt="Sheriff"
                      className="w-10 h-10 rounded-full border border-aged-gold"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDWJiOK3ZMTMgoGv79hI1ibpEmgNdE05ewC4Ot7GfPsApY5zJhm6HSQxfsmg3q5dl9rrqrHNOPUdx8x3g5g9gTTNnMOMk1ha3nSzc1jkV_xblIjxOAn1ymDh6wrOB3mSk396N6bHBn2fL6nDZR76JYaCWH9KWYP6xWnUfyuimXCLnKuUPpYlfx8bpeMq7dgvLEgtvaS4zXQrQduoy3iZ2CGwdMyirLHU4Iay5di_eXRaLlUpmJfJB_-nmK6iLb_UrKclCy-fHSsrdZm"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">Baş Şerif Analist</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Vahşi Batı Ekibi</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="bg-saddle-brown/10 rounded-2xl border border-saddle-brown/30 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-saddle-brown">support_agent</span>
                  <h4 className="font-bold text-sm uppercase tracking-widest text-saddle-brown">Destek Hattı</h4>
                </div>
                <p className="text-[11px] text-slate-300 mb-4 leading-relaxed">
                  Arşiv verileri hakkında detaylı sorgulama yapmak için şerif masasına telgraf bırakın.
                </p>
                <button className="w-full py-3 bg-saddle-brown text-white text-[10px] font-bold rounded-lg uppercase tracking-[0.2em] hover:bg-opacity-80 transition-all">
                  CANLI DESTEK BAĞLAN
                </button>
              </div>

              {/* Top Wins */}
              <div className="bg-card-dark rounded-2xl border border-white/5 p-6">
                <h4 className="font-bold text-xs uppercase tracking-widest text-slate-500 mb-4">En Büyük Vurgunlar</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tottenham - City</span>
                    <span className="text-primary font-bold">4.50 Oran 💰</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Lazio - Roma</span>
                    <span className="text-primary font-bold">3.80 Oran 💰</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MobileNav activeTab="gecmis-veriler" />
    </div>
  );
}
