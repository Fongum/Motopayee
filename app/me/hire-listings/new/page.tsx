'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const FEATURES_OPTIONS = [
  'Climatisation', 'GPS', 'Bluetooth', 'Caméra de recul', 'Toit ouvrant',
  'Sièges cuir', 'Régulateur de vitesse', 'Capteurs de stationnement',
  'Lecteur USB', 'Porte-bagages', '4x4', 'Dashcam',
];

export default function NewHireListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  function toggleFeature(f: string) {
    setSelectedFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const body: Record<string, unknown> = {
      make: form.get('make'),
      model: form.get('model'),
      year: parseInt(form.get('year') as string),
      fuel_type: form.get('fuel_type'),
      transmission: form.get('transmission'),
      color: form.get('color') || undefined,
      seats: parseInt(form.get('seats') as string) || 5,
      engine_cc: form.get('engine_cc') ? parseInt(form.get('engine_cc') as string) : undefined,
      plate_number: form.get('plate_number') || undefined,
      hire_type: form.get('hire_type'),
      daily_rate: parseInt(form.get('daily_rate') as string),
      weekly_rate: form.get('weekly_rate') ? parseInt(form.get('weekly_rate') as string) : undefined,
      monthly_rate: form.get('monthly_rate') ? parseInt(form.get('monthly_rate') as string) : undefined,
      deposit_amount: form.get('deposit_amount') ? parseInt(form.get('deposit_amount') as string) : 0,
      driver_daily_rate: form.get('driver_daily_rate') ? parseInt(form.get('driver_daily_rate') as string) : undefined,
      mileage_limit_per_day_km: form.get('mileage_limit') ? parseInt(form.get('mileage_limit') as string) : undefined,
      extra_km_charge: form.get('extra_km_charge') ? parseInt(form.get('extra_km_charge') as string) : undefined,
      min_hire_days: parseInt(form.get('min_hire_days') as string) || 1,
      max_hire_days: form.get('max_hire_days') ? parseInt(form.get('max_hire_days') as string) : undefined,
      city: form.get('city'),
      zone: form.get('zone'),
      address: form.get('address') || undefined,
      description: form.get('description') || undefined,
      conditions: form.get('conditions') || undefined,
      features: selectedFeatures,
      insurance_included: form.get('insurance_included') === 'on',
    };

    try {
      const res = await fetch('/api/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors de la création');
        return;
      }
      router.push('/me/hire-listings');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d9e3d]';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Ajouter un véhicule en location</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Vehicle Info */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Informations du véhicule</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Marque *</label>
              <input name="make" required placeholder="Ex: Toyota" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Modèle *</label>
              <input name="model" required placeholder="Ex: Corolla" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Année *</label>
              <input name="year" type="number" required min={1990} max={2027} placeholder="2020" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Carburant</label>
              <select name="fuel_type" className={inputCls}>
                <option value="petrol">Essence</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Électrique</option>
                <option value="hybrid">Hybride</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Boîte de vitesses</label>
              <select name="transmission" className={inputCls}>
                <option value="automatic">Automatique</option>
                <option value="manual">Manuelle</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Places</label>
              <input name="seats" type="number" min={2} max={50} defaultValue={5} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Couleur</label>
              <input name="color" placeholder="Ex: Noir" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cylindrée (cc)</label>
              <input name="engine_cc" type="number" placeholder="1800" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Immatriculation</label>
              <input name="plate_number" placeholder="Ex: LT-1234-AA" className={inputCls} />
            </div>
          </div>
        </section>

        {/* Hire Config */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Configuration de la location</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Type de location *</label>
              <select name="hire_type" className={inputCls}>
                <option value="self_drive">Sans chauffeur</option>
                <option value="with_driver">Avec chauffeur</option>
                <option value="both">Les deux options</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Tarif journalier (XAF) *</label>
              <input name="daily_rate" type="number" required min={1000} placeholder="25000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tarif hebdomadaire (XAF)</label>
              <input name="weekly_rate" type="number" placeholder="150000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tarif mensuel (XAF)</label>
              <input name="monthly_rate" type="number" placeholder="500000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Caution (XAF)</label>
              <input name="deposit_amount" type="number" defaultValue={0} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tarif chauffeur/jour (XAF)</label>
              <input name="driver_daily_rate" type="number" placeholder="10000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Limite km/jour</label>
              <input name="mileage_limit" type="number" placeholder="200" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Coût km supplémentaire (XAF)</label>
              <input name="extra_km_charge" type="number" placeholder="100" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Durée min (jours)</label>
              <input name="min_hire_days" type="number" min={1} defaultValue={1} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Durée max (jours)</label>
              <input name="max_hire_days" type="number" placeholder="30" className={inputCls} />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input name="insurance_included" type="checkbox" id="insurance" className="w-4 h-4 text-[#3d9e3d] rounded" />
              <label htmlFor="insurance" className="text-sm text-gray-700">Assurance incluse</label>
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Localisation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Ville *</label>
              <input name="city" required placeholder="Ex: Douala" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Zone *</label>
              <select name="zone" className={inputCls}>
                <option value="A">Zone A</option>
                <option value="B">Zone B</option>
                <option value="C">Zone C</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Adresse</label>
              <input name="address" placeholder="Quartier, rue..." className={inputCls} />
            </div>
          </div>
        </section>

        {/* Description & Conditions */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Description et conditions</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Description</label>
              <textarea name="description" rows={3} placeholder="Décrivez votre véhicule..." className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>Conditions de location</label>
              <textarea name="conditions" rows={3} placeholder="Conditions requises, politique carburant..." className={inputCls + ' resize-none'} />
            </div>
            <div>
              <label className={labelCls}>Équipements</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {FEATURES_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFeature(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      selectedFeatures.includes(f)
                        ? 'bg-[#3d9e3d] text-white border-[#3d9e3d]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#3d9e3d]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#3d9e3d] text-white font-semibold py-3 rounded-xl hover:bg-[#2d8a2d] transition disabled:opacity-50"
        >
          {loading ? 'Création en cours...' : 'Soumettre pour examen'}
        </button>
      </form>
    </div>
  );
}
