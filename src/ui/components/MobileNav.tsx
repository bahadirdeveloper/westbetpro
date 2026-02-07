import Link from 'next/link';

export default function MobileNav({ activeTab }: { activeTab: string }) {
  const items = [
    { id: 'panel', icon: 'dashboard', label: 'Panel', path: '/dashboard' },
    { id: 'canli-analiz', icon: 'radar', label: 'Canli', path: '/live-analysis' },
    { id: 'gecmis-veriler', icon: 'history_edu', label: 'Gecmis', path: '/historical-data' },
    { id: 'ai-model', icon: 'psychology', label: 'AI', path: '/ai-model' },
  ];

  return (
    <div className="lg:hidden fixed bottom-4 left-4 right-4 sm:left-auto sm:right-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 bg-card-dark/95 backdrop-blur-xl border border-white/10 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-full flex items-center justify-around sm:justify-center sm:gap-6 shadow-2xl z-50">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.path}
          className={`flex flex-col items-center gap-0.5 ${activeTab === item.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'} transition-colors`}
        >
          <span className="material-icons-round text-xl sm:text-2xl">{item.icon}</span>
          <span className="text-[9px] sm:text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
