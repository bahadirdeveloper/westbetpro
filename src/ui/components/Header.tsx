import Link from 'next/link';

export default function Header({ statusText, searchPlaceholder }: { statusText: string; searchPlaceholder?: string }) {
  return (
    <header className="glass-nav border-b border-white/5 sticky top-0 z-40 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="text-xs font-bold text-primary tracking-widest uppercase">{statusText}</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group hidden md:block">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            search
          </span>
          <input
            className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary w-64 outline-none"
            placeholder={searchPlaceholder || 'Maç veya takım ara...'}
            type="text"
          />
        </div>

        <button className="relative text-slate-400 hover:text-white transition-colors">
          <span className="material-icons-round">notifications</span>
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-background-dark"></span>
        </button>

        {/* Admin Login Button */}
        <Link
          href="/admin/login"
          className="flex items-center gap-2 px-4 py-2 bg-saddle-brown/20 hover:bg-saddle-brown/30 text-aged-gold border border-aged-gold/20 rounded-lg transition-all"
        >
          <span className="material-icons-round text-sm">admin_panel_settings</span>
          <span className="hidden sm:inline text-sm font-medium">Admin</span>
        </Link>

        <div className="h-8 w-[1px] bg-white/10"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">Admin Şerifi</p>
            <p className="text-[10px] text-aged-gold">Vahşi Batı Planı</p>
          </div>
          <img
            alt="User Avatar"
            className="w-10 h-10 rounded-full border border-aged-gold"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXpNX3NGHAxip_NPRBd5juv6cWDfIa2FxeuKp5_nJkyJlxOEyJmUaEiKgu2b3_VcJ7UxGwdFHoLSIe_9tXB1EMa3c0Ww7QPCtNM4ksQTqS45TNbHX0qJWSNGD-WR-hXpXjisePuPnP-ciUbSsV_iIgb3-xhIoBvLZNvXneDKaZ29VNZKhfKE1K6YIBTLgIr7AbrfqCUJlWx6NvUDKWffv9Hn4f4lnlhQTdTYihOxrhWMDBJ1KFXJjXXPMzDPPSeFR0HisQowMuzV5a"
          />
        </div>
      </div>
    </header>
  );
}
