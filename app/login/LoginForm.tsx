'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { login } from '@/lib/auth/client';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get('reset') === 'success';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error ?? 'Connexion échouée.');
      setLoading(false);
      return;
    }

    // Redirect based on role stored in cookie (read fresh from /api/auth/me)
    const meRes = await fetch('/api/auth/me');
    if (meRes.ok) {
      const { user } = await meRes.json();
      if (user.role === 'buyer') router.push('/me/applications');
      else if (user.role === 'seller_individual' || user.role === 'seller_dealer') router.push('/me/listings');
      else router.push('/admin/dashboard');
    } else {
      router.push('/');
    }
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-8">
        <h1 className="text-2xl font-bold text-brand-navy mb-2">Connexion</h1>
        <p className="text-gray-500 text-sm mb-8">Connectez-vous à votre compte MotoPayee</p>

        {justReset && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm mb-5">
            Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green transition"
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-brand-navy hover:text-brand-green transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark disabled:opacity-50 transition shadow-sm"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-brand-navy hover:text-brand-green font-semibold transition-colors">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
