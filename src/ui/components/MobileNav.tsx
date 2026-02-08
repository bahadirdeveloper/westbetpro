'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav({ activeTab }: { activeTab: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const mainItems = [
    { id: 'panel', icon: 'dashboard', label: 'Panel', path: '/dashboard' },
    { id: 'canli-analiz', icon: 'radar', label: 'Canli', path: '/live-analysis' },
    { id: 'gecmis-veriler', icon: 'history_edu', label: 'Gecmis', path: '/historical-data' },
    { id: 'ai-model', icon: 'psychology', label: 'AI', path: '/ai-model' },
  ];

  const moreItems = [
    { id: 'roi-hesaplayici', icon: 'calculate', label: 'ROI Hesaplayici', path: '/roi-calculator' },
    { id: 'kasa-yonetimi', icon: 'account_balance_wallet', label: 'Kasa Yonetimi', path: '/bankroll-management' },
  ];

  const isMoreActive = moreItems.some(item => item.id === activeTab);

  // Close popup on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close popup on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  return (
    <>
      {/* More menu popup */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      <nav
        className="lg:hidden fixed left-3 right-3 sm:left-auto sm:right-auto sm:left-1/2 sm:-translate-x-1/2 bg-card-dark/95 backdrop-blur-xl border border-white/10 px-3 sm:px-6 py-2.5 sm:py-3 rounded-2xl sm:rounded-full flex items-center justify-around sm:justify-center sm:gap-6 shadow-2xl shadow-black/50 z-50"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {mainItems.map((item) => {
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

        {/* More / Tools button */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-0.5 relative transition-colors ${isMoreActive ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {isMoreActive && (
              <span className="absolute -top-2.5 w-5 h-0.5 rounded-full bg-primary" />
            )}
            <span className={`material-icons-round text-xl sm:text-2xl ${isMoreActive ? 'drop-shadow-[0_0_6px_rgba(0,255,102,0.3)]' : ''}`}>
              {moreOpen ? 'close' : 'more_horiz'}
            </span>
            <span className={`text-[9px] sm:text-[10px] ${isMoreActive ? 'font-bold' : 'font-medium'}`}>Daha</span>
          </button>

          {/* Popup */}
          {moreOpen && (
            <div className="absolute bottom-full mb-3 right-0 min-w-[200px] bg-card-dark/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kovboy Aletleri</span>
              </div>
              {moreItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-3 transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="material-icons-round text-lg">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
