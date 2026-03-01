'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/(components)/Navbar';

const CHECKLIST_ITEMS = [
  'Carrosserie — pas de rouille majeure',
  'Pare-chocs — complets et non fissurés',
  'Vitres — sans fissures',
  'Intérieur — propre et fonctionnel',
  'Tableau de bord — aucun voyant allumé',
  'Moteur — démarrage facile, sans fumée',
  'Transmission — passage de vitesses fluide',
  'Freins — efficaces avant et arrière',
  'Pneus — profondeur > 3mm',
  'Climatisation — fonctionne',
  'Éclairage — tous les feux fonctionnels',
  'Papiers — titre de propriété conforme',
];

export default function InspectorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [listing, setListing] = useState<Record<string, unknown> | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [conditionGrade, setConditionGrade] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [financeable, setFinanceable] = useState(true);
  const [repairLow, setRepairLow] = useState('');
  const [repairHigh, setRepairHigh] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/listings/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setListing(d?.listing ?? null))
      .catch(() => {});
  }, [params.id]);

  function toggleCheck(item: string) {
    setChecklist((c) => ({ ...c, [item]: !c[item] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const res = await fetch(`/api/inspections/${params.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        condition_grade: conditionGrade,
        financeable,
        report_json: { checklist },
        repair_estimate_low: repairLow ? parseFloat(repairLow) : null,
        repair_estimate_high: repairHigh ? parseFloat(repairHigh) : null,
        notes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la soumission.');
      setSubmitting(false);
      return;
    }

    router.push('/admin/dashboard');
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Rapport d&apos;inspection</h1>
        {!!listing?.vehicle && (
          <p className="text-gray-500 text-sm mb-8">
            {String((listing.vehicle as Record<string, unknown>).year ?? '')}{' '}
            {String((listing.vehicle as Record<string, unknown>).make ?? '')}{' '}
            {String((listing.vehicle as Record<string, unknown>).model ?? '')}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Checklist */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Liste de vérification</h2>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map((item) => (
                <label key={item} className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={checklist[item] ?? false}
                    onChange={() => toggleCheck(item)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Grade */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Grade de condition</h2>
            <div className="grid grid-cols-4 gap-3">
              {(['A', 'B', 'C', 'D'] as const).map((g) => (
                <label key={g} className="cursor-pointer">
                  <input
                    type="radio"
                    name="grade"
                    value={g}
                    checked={conditionGrade === g}
                    onChange={() => setConditionGrade(g)}
                    className="sr-only"
                  />
                  <div className={`text-center py-3 rounded-xl border-2 text-sm font-bold transition ${
                    conditionGrade === g
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}>
                    {g}
                    <p className="text-xs font-normal mt-0.5">
                      {g === 'A' ? 'Excellent' : g === 'B' ? 'Bon' : g === 'C' ? 'Correct' : 'Mauvais'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Financeable + repairs */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Financement & réparations</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={financeable}
                onChange={(e) => setFinanceable(e.target.checked)}
              />
              <span className="text-sm text-gray-700 font-medium">Ce véhicule est éligible au financement</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Réparations min. (XAF)</label>
                <input
                  type="number"
                  value={repairLow}
                  onChange={(e) => setRepairLow(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Réparations max. (XAF)</label>
                <input
                  type="number"
                  value={repairHigh}
                  onChange={(e) => setRepairHigh(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Notes supplémentaires</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm resize-none"
                placeholder="Observations, recommandations..."
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Soumission...' : 'Soumettre le rapport d\'inspection'}
          </button>
        </form>
      </main>
    </>
  );
}
