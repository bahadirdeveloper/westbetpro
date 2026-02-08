import Link from 'next/link';

export default function Header({ statusText, searchPlaceholder }: { statusText: string; searchPlaceholder?: string }) {
  return (
    <header className="glass-nav border-b border-white/5 sticky top-0 z-40 px-3 sm:px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between gap-2">
      {/* Status indicator */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 border border-primary/10 rounded-full min-w-0">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></span>
          <span className="text-[9px] sm:text-[10px] font-bold text-primary tracking-wider uppercase truncate max-w-[140px] sm:max-w-[200px] md:max-w-none">{statusText}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
        {/* Search */}
        <div className="relative group hidden lg:block">
          <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
            search
          </span>
          <input
            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary/30 w-56 xl:w-64 outline-none transition-all focus:bg-white/[0.03]"
            placeholder={searchPlaceholder || 'Mac veya takim ara...'}
            type="text"
          />
        </div>

        {/* Notifications */}
        <button className="relative text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg">
          <span className="material-icons-round text-xl">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        {/* Admin */}
        <Link
          href="/admin/login"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-saddle-brown/15 hover:bg-saddle-brown/25 text-aged-gold border border-aged-gold/15 rounded-xl transition-all"
        >
          <span className="material-icons-round text-sm">admin_panel_settings</span>
          <span className="hidden sm:inline text-xs sm:text-sm font-medium">Admin</span>
        </Link>

        <div className="h-6 sm:h-8 w-[1px] bg-white/10 hidden sm:block"></div>

        {/* User */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-white">Admin Serifi</p>
            <p className="text-[10px] text-aged-gold/70">Vahsi Bati Plani</p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary/20 to-aged-gold/20 border border-aged-gold/20 flex items-center justify-center flex-shrink-0">
            <span className="material-icons-round text-aged-gold text-sm">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
