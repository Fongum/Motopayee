'use client';

import { useState } from 'react';

interface UploadResult {
  created: number;
  total_rows: number;
  listing_ids: string[];
  errors: { row: number; reason: string }[];
}

export default function BulkUploadForm() {
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csv.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/api/seller/listings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur lors du téléversement.');
      } else {
        setResult(data);
      }
    } catch {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Données CSV
        </label>
        <textarea
          value={csv}
          onChange={e => setCsv(e.target.value)}
          rows={12}
          placeholder={
            'make,model,year,mileage_km,fuel_type,transmission,asking_price,zone,city,color\n' +
            'Toyota,Corolla,2018,45000,petrol,manual,4500000,A,Yaoundé,Blanc'
          }
          className="w-full font-mono text-xs border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="bg-green-50 text-green-700 font-semibold px-3 py-1.5 rounded-lg">
              ✓ {result.created} annonce{result.created !== 1 ? 's' : ''} créée{result.created !== 1 ? 's' : ''}
            </span>
            {result.errors.length > 0 && (
              <span className="bg-red-50 text-red-700 font-semibold px-3 py-1.5 rounded-lg">
                {result.errors.length} erreur{result.errors.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-1">
              <p className="text-xs font-semibold text-red-700 mb-2">Lignes en erreur :</p>
              {result.errors.map(err => (
                <p key={err.row} className="text-xs text-red-600">
                  Ligne {err.row} : {err.reason}
                </p>
              ))}
            </div>
          )}
          {result.created > 0 && (
            <p className="text-xs text-gray-500">
              Les annonces créées ont le statut <em>brouillon</em>. Soumettez les documents de
              propriété pour chaque annonce depuis votre tableau de bord.
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !csv.trim()}
        className="w-full bg-[#1a3a6b] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#142d54] disabled:opacity-50"
      >
        {loading ? 'Téléversement...' : 'Importer les annonces'}
      </button>
    </form>
  );
}
