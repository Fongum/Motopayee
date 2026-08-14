'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Role } from '@/lib/types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'buyer', label: 'Acheteur — Je veux financer un véhicule' },
  { value: 'seller_individual', label: 'Vendeur particulier — Je veux vendre mon véhicule' },
  { value: 'seller_dealer', label: 'Concessionnaire — Je gère un parc de véhicules' },
];

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get('role') as Role | null) ?? 'buyer';
  const refCode = searchParams.get('ref') ?? '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(defaultRole);
  const [referralCode, setReferralCode] = useState(refCode);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Inscription échouée.');
      setLoading(false);
      return;
    }

    // Apply referral code if provided
    if (referralCode.trim()) {
      await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referral_code: referralCode.trim() }),
      }).catch(() => {});
    }

    router.push('/onboarding');
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-card p-8">
        <h1 className="text-2xl font-bold text-[#1a3a6b] mb-2">Créer un compte</h1>
        <p className="text-gray-500 text-sm mb-8">Rejoignez MotoPayee gratuitement</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9e3d]/40 focus:border-[#3d9e3d] transition"
              placeholder="Jean Dupont"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9e3d]/40 focus:border-[#3d9e3d] transition"
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9e3d]/40 focus:border-[#3d9e3d] transition"
              placeholder="Minimum 8 caractères"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Je suis</label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label key={r.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-0.5 accent-[#3d9e3d]"
                  />
                  <span className="text-sm text-gray-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Code de parrainage <span className="text-gray-400 font-normal">(optionnel)</span></label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9e3d]/40 focus:border-[#3d9e3d] transition uppercase tracking-wider"
              placeholder="MP-XXXXXX"
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
            className="w-full bg-[#3d9e3d] text-white font-semibold py-3 rounded-xl hover:bg-[#2d8a2d] disabled:opacity-50 transition shadow-sm"
          >
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-[#1a3a6b] hover:text-[#3d9e3d] font-semibold transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
