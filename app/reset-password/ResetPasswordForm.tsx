'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';

type Status = 'verifying' | 'ready' | 'invalid' | 'submitting';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createBrowserClient();

    // Supabase appends `#error=...` to the redirect URL when the link itself
    // is already expired or was already used — no point waiting it out.
    if (typeof window !== 'undefined' && /error=/.test(window.location.hash)) {
      setStatus('invalid');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready');
    });

    // Covers the race where the SDK already parsed the recovery link and
    // established the session before this listener was attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((s) => (s === 'verifying' ? 'ready' : s));
    });

    const timeout = setTimeout(() => {
      setStatus((s) => (s === 'verifying' ? 'invalid' : s));
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setStatus('submitting');
    const supabase = createBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'Impossible de mettre à jour le mot de passe.');
      setStatus('ready');
      return;
    }

    // This recovery session only exists in the browser SDK's own storage —
    // the app's real session lives in httpOnly cookies set by /api/auth/*.
    // Drop it so the two never linger side by side.
    await supabase.auth.signOut().catch(() => {});
    router.push('/login?reset=success');
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-8">
        <h1 className="text-2xl font-bold text-brand-navy mb-2">Nouveau mot de passe</h1>

        {status === 'verifying' && (
          <p className="text-gray-500 text-sm">Vérification du lien...</p>
        )}

        {status === 'invalid' && (
          <div className="space-y-5">
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              Ce lien de réinitialisation est invalide ou a expiré.
            </div>
            <Link
              href="/forgot-password"
              className="block w-full text-center bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark transition shadow-sm"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}

        {(status === 'ready' || status === 'submitting') && (
          <>
            <p className="text-gray-500 text-sm mb-8">Choisissez votre nouveau mot de passe.</p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green transition"
                  placeholder="Minimum 8 caractères"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
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
                disabled={status === 'submitting'}
                className="w-full bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark disabled:opacity-50 transition shadow-sm"
              >
                {status === 'submitting' ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
