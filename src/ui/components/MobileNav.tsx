import Link from 'next/link';

export default function MobileNav({ activeTab }: { activeTab: string }) {
  const items = [
    { id: 'panel', icon: 'dashboard', path: '/dashboard' },
    { id: 'canli-analiz', icon: 'radar', path: '/live-analysis' },
    { id: 'gecmis-veriler', icon: 'history_edu', path: '/historical-data' },
    { id: 'ai-model', icon: 'psychology', path: '/ai-model' },
  ];

  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-card-dark/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-full flex items-center gap-8 shadow-2xl z-50">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.path}
          className={activeTab === item.id ? 'text-primary' : 'text-slate-500'}
        >
          <span className="material-icons-round">{item.icon}</span>
        </Link>
      ))}
    </div>
  );
}
