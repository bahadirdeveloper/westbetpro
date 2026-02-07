import Link from 'next/link';

export default function MobileNav({ activeTab }: { activeTab: string }) {
  const items = [
    { id: 'panel', icon: 'dashboard', label: 'Panel', path: '/dashboard' },
    { id: 'canli-analiz', icon: 'radar', label: 'Canli', path: '/live-analysis' },
    { id: 'gecmis-veriler', icon: 'history_edu', label: 'Gecmis', path: '/historical-data' },
    { id: 'ai-model', icon: 'psychology', label: 'AI', path: '/ai-model' },
  ];

  return (
    <div className="lg:hidden fixed bottom-4 left-3 right-3 sm:left-auto sm:right-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 bg-card-dark/95 backdrop-blur-xl border border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 rounded-2xl sm:rounded-full flex items-center justify-around sm:justify-center sm:gap-6 shadow-2xl shadow-black/50 z-50">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <Link
            key={item.id}
            href={item.path}
            className={`flex flex-col items-center gap-0.5 relative transition-colors ${isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {isActive && (
              <span className="absolute -top-2.5 w-5 h-0.5 rounded-full bg-primary" />
            )}
            <span className={`material-icons-round text-xl sm:text-2xl ${isActive ? 'drop-shadow-[0_0_6px_rgba(0,255,102,0.3)]' : ''}`}>{item.icon}</span>
            <span className={`text-[9px] sm:text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
