'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(searchParams: SearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function NewListingPage({ searchParams }: { searchParams?: SearchParams }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const launchLeadId = firstParam(searchParams, 'launch_lead_id');

  const [form, setForm] = useState({
    make: '', model: '', year: new Date().getFullYear().toString(),
    mileage_km: '0', fuel_type: 'petrol', transmission: 'manual',
    color: '', engine_cc: '', seats: '',
    asking_price: '', zone: 'A', city: firstParam(searchParams, 'city'), description: firstParam(searchParams, 'description'),
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/seller/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        year: parseInt(form.year, 10),
        mileage_km: parseInt(form.mileage_km, 10),
        engine_cc: form.engine_cc ? parseInt(form.engine_cc, 10) : null,
        seats: form.seats ? parseInt(form.seats, 10) : null,
        asking_price: parseFloat(form.asking_price),
        launch_lead_id: launchLeadId || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la création.');
      setSubmitting(false);
      return;
    }

    router.push(`/me/listings/${data.listing.id}`);
  }

  const inputClass = 'w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9e3d]/40 focus:border-[#3d9e3d] transition';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/me/listings" className="text-sm font-medium text-[#1a3a6b] hover:text-[#3d9e3d] transition-colors">← Mes annonces</Link>
        <h1 className="text-2xl font-bold text-[#1a3a6b]">Nouvelle annonce</h1>
      </div>

      {launchLeadId && (
        <div className="mb-6 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Creation depuis un lead lancement. La ville et les notes ont ete pre-remplies quand disponibles.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Informations du véhicule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Marque *</label>
              <input type="text" required value={form.make} onChange={(e) => update('make', e.target.value)} placeholder="Toyota" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Modèle *</label>
              <input type="text" required value={form.model} onChange={(e) => update('model', e.target.value)} placeholder="Corolla" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Année *</label>
              <input type="number" required min="1960" max={new Date().getFullYear() + 1} value={form.year} onChange={(e) => update('year', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Kilométrage (km) *</label>
              <input type="number" required min="0" value={form.mileage_km} onChange={(e) => update('mileage_km', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Carburant *</label>
              <select value={form.fuel_type} onChange={(e) => update('fuel_type', e.target.value)} className={inputClass}>
                <option value="petrol">Essence</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Électrique</option>
                <option value="hybrid">Hybride</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Transmission *</label>
              <select value={form.transmission} onChange={(e) => update('transmission', e.target.value)} className={inputClass}>
                <option value="manual">Manuelle</option>
                <option value="automatic">Automatique</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Couleur</label>
              <input type="text" value={form.color} onChange={(e) => update('color', e.target.value)} placeholder="Blanc" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Cylindrée (cc)</label>
              <input type="number" value={form.engine_cc} onChange={(e) => update('engine_cc', e.target.value)} placeholder="1600" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Listing info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Détails de l&apos;annonce</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prix demandé (XAF) *</label>
              <input type="number" required min="0" value={form.asking_price} onChange={(e) => update('asking_price', e.target.value)} placeholder="5000000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Zone *</label>
              <select value={form.zone} onChange={(e) => update('zone', e.target.value)} className={inputClass}>
                <option value="A">Zone A — Grandes villes</option>
                <option value="B">Zone B — Villes secondaires</option>
                <option value="C">Zone C — Rural</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Ville</label>
              <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Douala" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              placeholder="Décrivez l'état du véhicule, les équipements, l'historique..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#3d9e3d] text-white font-semibold py-3 rounded-xl hover:bg-[#2d8a2d] disabled:opacity-50 transition shadow-sm"
        >
          {submitting ? 'Création...' : 'Créer l\'annonce'}
        </button>
      </form>
    </div>
  );
}
