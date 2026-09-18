'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {});

    // Always show the same confirmation, whether or not the email is
    // registered — the response body carries no signal either way.
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-8">
        <h1 className="text-2xl font-bold text-brand-navy mb-2">Mot de passe oublié</h1>
        <p className="text-gray-500 text-sm mb-8">
          Indiquez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm">
            Si un compte existe pour cet email, un lien de réinitialisation vient d&apos;être envoyé. Vérifiez votre boîte de réception.
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-green text-white font-semibold py-3 rounded-xl hover:bg-brand-green-dark disabled:opacity-50 transition shadow-sm"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-500 text-center mt-6">
          <Link href="/login" className="text-brand-navy hover:text-brand-green font-semibold transition-colors">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
