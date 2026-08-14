'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/auth/client';

interface Partner {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  products: { type: string; label: string }[];
}

interface Props {
  vehicleValueXaf: number;
  listingId?: string;
  hireListingId?: string;
}

export default function InsuranceQuoteWidget({ vehicleValueXaf, listingId, hireListingId }: Props) {
  const { user } = useUser();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [productType, setProductType] = useState('third_party');
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ annual_premium_xaf: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/insurance')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPartners(data);
          if (data.length > 0) setSelectedPartner(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  async function requestQuote() {
    if (!user) return;
    setLoading(true);
    setError('');
    setQuote(null);
    const res = await fetch('/api/insurance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: selectedPartner,
        product_type: productType,
        vehicle_value_xaf: vehicleValueXaf,
        listing_id: listingId,
        hire_listing_id: hireListingId,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setQuote(data);
    } else {
      setError(data.error ?? 'Erreur');
    }
    setLoading(false);
  }

  if (partners.length === 0) return null;

  const PRODUCT_LABELS: Record<string, string> = {
    third_party: 'Responsabilité civile',
    comprehensive: 'Tous risques',
    hire_coverage: 'Couverture location',
  };

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-[#1a3a6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h3 className="text-sm font-bold text-[#1a3a6b]">Assurance véhicule</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Assureur</label>
          <select
            value={selectedPartner}
            onChange={(e) => setSelectedPartner(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#3d9e3d]"
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Type de couverture</label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#3d9e3d]"
          >
            {Object.entries(PRODUCT_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {!user ? (
          <p className="text-xs text-gray-400">Connectez-vous pour obtenir un devis.</p>
        ) : (
          <button
            onClick={requestQuote}
            disabled={loading}
            className="w-full bg-[#1a3a6b] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#15305a] transition disabled:opacity-50"
          >
            {loading ? 'Calcul...' : 'Obtenir un devis'}
          </button>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        {quote && (
          <div className="bg-white border border-green-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Prime annuelle estimée</p>
            <p className="text-xl font-extrabold text-[#3d9e3d]">
              {quote.annual_premium_xaf.toLocaleString('fr-FR')} XAF
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              soit ~{Math.round(quote.annual_premium_xaf / 12).toLocaleString('fr-FR')} XAF/mois
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
