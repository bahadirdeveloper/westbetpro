'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/ui/components/admin/AdminSidebar';
import Header from '@/ui/components/Header';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        const response = await fetch(`${API_BASE}/api/health`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('admin_token');
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

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

  // Don't render protected content if not authenticated
  if (!isAuthenticated) return null;

  return (
    <div className="bg-background-dark text-slate-100 font-display min-h-screen">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen">
        <Header statusText="Admin Panel - Sistem Aktif" />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
