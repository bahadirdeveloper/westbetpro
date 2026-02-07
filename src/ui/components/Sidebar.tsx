import Link from 'next/link';

export default function Sidebar({ activeTab }: { activeTab: string }) {
  const navItems = [
    { id: 'panel', icon: 'dashboard', label: 'Panel', path: '/dashboard' },
    { id: 'canli-analiz', icon: 'radar', label: 'Canli Analiz', path: '/live-analysis' },
    { id: 'gecmis-veriler', icon: 'history_edu', label: 'Gecmis Veriler', path: '/historical-data' },
    { id: 'ai-model', icon: 'psychology', label: 'AI Model Detay', path: '/ai-model' },
  ];

  const tools = [
    { id: 'roi-hesaplayici', icon: 'calculate', label: 'ROI Hesaplayici', path: '/roi-calculator' },
    { id: 'kasa-yonetimi', icon: 'account_balance_wallet', label: 'Kasa Yonetimi', path: '/bankroll-management' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card-dark border-r border-aged-gold/10 hidden lg:flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="material-icons-round text-primary text-2xl">star</span>
        </div>
        <div>
          <h1 className="font-western text-aged-gold text-lg tracking-wider leading-tight">WEST</h1>
          <p className="text-[9px] text-primary font-bold tracking-[0.3em] -mt-0.5">ANALYZE PRO</p>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 mt-6 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-4 text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-2">Navigasyon</p>
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTab === item.id
                ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(0,255,102,0.06)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className={`material-icons-round text-xl ${activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'}`}>{item.icon}</span>
            <span className="font-medium text-sm">{item.label}</span>
            {activeTab === item.id && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </Link>
        ))}

        <div className="pt-6 pb-2">
          <p className="px-4 text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">Kovboy Aletleri</p>
        </div>

        {tools.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              activeTab === item.id
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className={`material-icons-round text-xl ${activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'}`}>{item.icon}</span>
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/5">
        <div className="bg-white/5 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Sistem Aktif</span>
          </div>
          <p className="text-[10px] text-slate-500">Canli veri motoru calisiyor</p>
        </div>
        <Link
          href="/admin/login"
          className="w-full bg-saddle-brown/20 hover:bg-saddle-brown/30 text-aged-gold border border-aged-gold/10 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-medium"
        >
          <span className="material-icons-round text-sm">admin_panel_settings</span>
          Admin Paneli
        </Link>
      </div>
    </aside>
  );
}
