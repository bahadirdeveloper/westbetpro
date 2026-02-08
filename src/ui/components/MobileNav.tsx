'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav({ activeTab }: { activeTab: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Listen for PWA install prompt
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
      setDeferredPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

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
      {/* More menu popup overlay */}
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowInstallGuide(false)}
        >
          <div
            className="bg-card-dark border border-aged-gold/20 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <span className="material-icons-round text-primary">install_mobile</span>
                  Uygulamayi Kur
                </h3>
                <button onClick={() => setShowInstallGuide(false)} className="text-slate-400 hover:text-white">
                  <span className="material-icons-round">close</span>
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {isIOS ? (
                <>
                  <p className="text-sm text-slate-300">Safari ile asagidaki adimlari izleyin:</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                      <div>
                        <p className="text-sm text-white font-medium">Paylas butonuna basin</p>
                        <p className="text-xs text-slate-400 mt-0.5">Alt bardaki <span className="material-icons-round text-xs align-middle">ios_share</span> ikonuna tiklayin</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                      <div>
                        <p className="text-sm text-white font-medium">&quot;Ana Ekrana Ekle&quot; secin</p>
                        <p className="text-xs text-slate-400 mt-0.5">Listede asagiya kayarak bulun</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                      <div>
                        <p className="text-sm text-white font-medium">&quot;Ekle&quot; butonuna basin</p>
                        <p className="text-xs text-slate-400 mt-0.5">Uygulama ana ekraniniza eklenecek</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300">Chrome ile asagidaki adimlari izleyin:</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                      <div>
                        <p className="text-sm text-white font-medium">Menu butonuna basin</p>
                        <p className="text-xs text-slate-400 mt-0.5">Sag ustteki <span className="material-icons-round text-xs align-middle">more_vert</span> ikonuna tiklayin</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                      <div>
                        <p className="text-sm text-white font-medium">&quot;Uygulamayi yükle&quot; secin</p>
                        <p className="text-xs text-slate-400 mt-0.5">veya &quot;Ana ekrana ekle&quot;</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                      <div>
                        <p className="text-sm text-white font-medium">&quot;Yükle&quot; butonuna basin</p>
                        <p className="text-xs text-slate-400 mt-0.5">Uygulama masaustunuze/ana ekraniniza eklenecek</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom tab bar - always visible, no scroll-hide */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-card-dark/95 backdrop-blur-xl border-t border-white/10 z-50"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center justify-around px-2 py-2">
          {mainItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 relative transition-colors ${isActive ? 'text-primary' : 'text-slate-500 active:text-slate-300'}`}
              >
                {isActive && (
                  <span className="absolute -top-2 w-5 h-0.5 rounded-full bg-primary" />
                )}
                <span className={`material-icons-round text-[22px] ${isActive ? 'drop-shadow-[0_0_6px_rgba(0,255,102,0.3)]' : ''}`}>{item.icon}</span>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </Link>
            );
          })}

          {/* More / Tools button */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 relative transition-colors ${isMoreActive ? 'text-primary' : 'text-slate-500 active:text-slate-300'}`}
            >
              {isMoreActive && (
                <span className="absolute -top-2 w-5 h-0.5 rounded-full bg-primary" />
              )}
              <span className={`material-icons-round text-[22px] ${isMoreActive ? 'drop-shadow-[0_0_6px_rgba(0,255,102,0.3)]' : ''}`}>
                {moreOpen ? 'close' : 'more_horiz'}
              </span>
              <span className={`text-[10px] ${isMoreActive ? 'font-bold' : 'font-medium'}`}>Daha</span>
            </button>

            {/* Popup */}
            {moreOpen && (
              <div className="absolute bottom-full mb-3 right-0 min-w-[220px] bg-card-dark/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
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

                {/* PWA Install Button */}
                {!isInstalled && (
                  <>
                    <div className="border-t border-white/5" />
                    <button
                      onClick={handleInstallClick}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left transition-all text-aged-gold hover:text-white hover:bg-aged-gold/10"
                    >
                      <span className="material-icons-round text-lg">install_mobile</span>
                      <div>
                        <span className="text-sm font-medium block">Uygulamayi Kur</span>
                        <span className="text-[10px] text-slate-500">Masaustune / ana ekrana ekle</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
