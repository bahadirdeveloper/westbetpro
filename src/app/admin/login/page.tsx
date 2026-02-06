'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Supabase Auth login
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        setError('Sistem yapılandırması eksik. Lütfen yöneticinize başvurun.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.access_token) {
        localStorage.setItem('admin_token', data.access_token);
        router.push('/admin/dashboard');
      } else {
        setError('Geçersiz email veya şifre');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Giriş yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card-dark border border-aged-gold/20 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-block bg-primary/10 rounded-full p-4 mb-4">
              <span className="material-icons-round text-primary text-5xl">shield</span>
            </div>
            <h1 className="font-western text-aged-gold text-3xl tracking-wider mb-2">ADMIN GİRİŞİ</h1>
            <p className="text-slate-400 text-sm">Sadece yetkili şerifler girebilir</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="admin@westbetpro.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="material-icons-round text-red-400 text-sm">error</span>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  Giriş yapılıyor...
                </span>
              ) : (
                'GİRİŞ YAP'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-slate-500 text-xs">
              WestBetPro Admin Panel v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
