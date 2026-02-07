'use client';

import { useRouter, usePathname } from 'next/navigation';

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', href: '/admin/dashboard' },
    { id: 'excel-upload', icon: 'upload_file', label: 'Excel Yükle', href: '/admin/excel-upload' },
    { id: 'engine', icon: 'settings', label: 'Motor Kontrolü', href: '/admin/engine' },
    { id: 'rule-discovery', icon: 'psychology', label: 'Kural Keşfi', href: '/admin/rule-discovery' },
    { id: 'matches', icon: 'sports_soccer', label: 'Maçlar', href: '/admin/matches' },
    { id: 'predictions', icon: 'analytics', label: 'Tahminler', href: '/admin/predictions' },
    { id: 'rules', icon: 'rule', label: 'Kural Performansı', href: '/admin/rules' },
    { id: 'logs', icon: 'description', label: 'Sistem Logları', href: '/admin/logs' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  };

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card-dark border-r border-aged-gold/20 hidden lg:flex flex-col z-50">
      {/* Logo Section */}
      <div className="p-6 border-b border-aged-gold/10">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <span className="material-icons-round text-primary text-2xl">shield</span>
          </div>
          <div>
            <h1 className="font-western text-aged-gold text-xl tracking-wider">ADMIN</h1>
            <p className="text-slate-500 text-xs">WestBetPro Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${isActive(item.href)
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-slate-400 hover:text-primary hover:bg-white/5'
              }
            `}
          >
            <span className="material-icons-round text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
            {isActive(item.href) && (
              <span className="ml-auto material-icons-round text-sm">chevron_right</span>
            )}
          </a>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-aged-gold/10">
        <div className="mb-3 px-4 py-2 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-icons-round text-green-400 text-sm">check_circle</span>
            <span className="text-xs text-slate-400">Sistem Aktif</span>
          </div>
          <p className="text-xs text-slate-500">Backend: Çalışıyor</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-saddle-brown hover:bg-opacity-90 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
        >
          <span className="material-icons-round text-sm">logout</span>
          <span className="font-medium">Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
}
