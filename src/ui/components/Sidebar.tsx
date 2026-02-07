import Link from 'next/link';

export default function Sidebar({ activeTab }: { activeTab: string }) {
  const navItems = [
    { id: 'panel', icon: 'dashboard', label: 'Panel', path: '/dashboard' },
    { id: 'canli-analiz', icon: 'radar', label: 'Canlı Analiz', path: '/live-analysis' },
    { id: 'gecmis-veriler', icon: 'history_edu', label: 'Geçmiş Veriler', path: '/historical-data' },
    { id: 'ai-model', icon: 'psychology', label: 'AI Model Detay', path: '/ai-model' },
  ];

  const tools = [
    { id: 'roi-hesaplayici', icon: 'calculate', label: 'ROI Hesaplayıcı', path: '/roi-calculator' },
    { id: 'kasa-yonetimi', icon: 'account_balance_wallet', label: 'Kasa Yönetimi', path: '/bankroll-management' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card-dark border-r border-aged-gold/20 hidden lg:flex flex-col z-50">
      <div className="p-6 flex items-center gap-3">
        <span className="material-icons-round text-primary text-3xl">star</span>
        <h1 className="font-western text-aged-gold text-xl tracking-wider">WEST ANALYZE</h1>
      </div>

      <nav className="flex-1 px-4 mt-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className={`flex items-center gap-4 px-4 py-3 transition-colors ${
              activeTab === item.id
                ? 'bg-primary/10 text-primary rounded-lg border border-primary/20'
                : 'text-slate-400 hover:text-primary'
            }`}
          >
            <span className="material-icons-round">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}

        <div className="pt-6 pb-2 px-4 text-xs font-bold text-slate-600 uppercase tracking-widest">
          Kovboy Aletleri
        </div>

        {tools.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className={`flex items-center gap-4 px-4 py-3 transition-colors ${
              activeTab === item.id
                ? 'bg-primary/10 text-primary rounded-lg border border-primary/20'
                : 'text-slate-400 hover:text-primary'
            }`}
          >
            <span className="material-icons-round">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <button className="w-full bg-saddle-brown hover:bg-opacity-90 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
          <span className="material-icons-round text-sm">logout</span>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
