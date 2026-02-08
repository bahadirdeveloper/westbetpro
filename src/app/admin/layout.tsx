'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/ui/components/admin/AdminSidebar';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for login page
      if (pathname === '/admin/login') {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('admin_token');

      if (!token) {
        router.push('/admin/login');
        return;
      }

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          localStorage.removeItem('admin_token');
          router.push('/admin/login');
          return;
        }

        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseKey
          }
        });

        if (response.ok) {
          const user = await response.json();
          if (user?.id) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('admin_token');
            router.push('/admin/login');
          }
        } else {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Show login page without auth check
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-slate-400">Yetkilendirme kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', href: '/admin/dashboard' },
    { id: 'engine', icon: 'engineering', label: 'Motor Kontrol', href: '/admin/engine' },
    { id: 'excel-upload', icon: 'upload_file', label: 'Excel Yükle', href: '/admin/excel-upload' },
    { id: 'rules', icon: 'rule', label: 'Altin Kurallar', href: '/admin/rules' },
    { id: 'rule-discovery', icon: 'psychology', label: 'Kural Keşfi', href: '/admin/rule-discovery' },
    { id: 'predictions', icon: 'analytics', label: 'Tahminler', href: '/admin/predictions' },
    { id: 'matches', icon: 'sports_soccer', label: 'Maclar', href: '/admin/matches' },
    { id: 'logs', icon: 'description', label: 'Loglar', href: '/admin/logs' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/admin/login');
  };

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card-dark/95 backdrop-blur-xl border-b border-aged-gold/20" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="material-icons-round text-primary text-xl">shield</span>
            <span className="font-western text-aged-gold text-lg tracking-wider">ADMIN</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Ana Sayfa"
            >
              <span className="material-icons-round text-xl">home</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              aria-label="Menu"
            >
              <span className="material-icons-round text-xl">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-card-dark max-h-[70vh] overflow-y-auto">
            <nav className="px-2 py-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    pathname === item.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="material-icons-round text-xl">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="px-4 py-3 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-saddle-brown/80 hover:bg-saddle-brown text-white py-2.5 rounded-lg transition-colors text-sm font-medium"
              >
                <span className="material-icons-round text-sm">logout</span>
                Cikis Yap
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content - mobilde top bar + safe-area, desktop'ta sidebar */}
      <main className="lg:ml-64 min-h-screen admin-main-content">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <header className="glass-nav border-b border-white/5 sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Admin Panel - Sistem Aktif</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span className="material-icons-round text-sm">home</span>
                Ana Sayfa
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <span className="material-icons-round text-sm">logout</span>
                Cikis
              </button>
            </div>
          </header>
        </div>
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
