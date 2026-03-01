'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/auth/client';

const CITIES: Record<string, string[]> = {
  A: ['Douala', 'Yaoundé', 'Limbé', 'Kribi'],
  B: ['Bafoussam', 'Bamenda', 'Ngaoundéré', 'Maroua', 'Bertoua', 'Ebolowa'],
  C: ['Kumba', 'Loum', 'Mbouda', 'Foumban', 'Dschang', 'Autre'],
};

export default function OnboardingForm() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState<'A' | 'B' | 'C'>('A');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) {
    router.push('/login');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, zone, city }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Erreur lors de la mise à jour.');
      setSubmitting(false);
      return;
    }

    // Redirect to portal
    if (user?.role === 'buyer') router.push('/me/applications');
    else if (user?.role === 'seller_individual' || user?.role === 'seller_dealer') router.push('/me/listings');
    else router.push('/');
    router.refresh();
  }

  const cities = CITIES[zone] ?? [];

  return (
    <div className="w-full max-w-md">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Complétez votre profil</h1>
        <p className="text-gray-500 text-sm mb-8">
          Quelques informations supplémentaires pour personnaliser votre expérience.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+237 6XX XXX XXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Zone géographique</label>
            <select
              value={zone}
              onChange={(e) => {
                setZone(e.target.value as 'A' | 'B' | 'C');
                setCity('');
              }}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="A">Zone A — Douala / Yaoundé</option>
              <option value="B">Zone B — Villes secondaires</option>
              <option value="C">Zone C — Rural / Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner une ville</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Enregistrement...' : 'Continuer'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
          >
            Passer cette étape
          </button>
        </form>
      </div>
    </div>
  );
}
