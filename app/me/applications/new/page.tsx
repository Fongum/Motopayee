'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/app/(components)/Navbar';
import type { Listing } from '@/lib/types';

export default function NewApplicationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get('listing');

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    fetch(`/api/listings/${listingId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        setListing(d?.listing ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [listingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listingId) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Erreur lors de la création.');
      setSubmitting(false);
      return;
    }

    router.push(`/me/applications/${data.application.id}`);
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Demander un financement</h1>

        {!listingId ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            Aucun véhicule sélectionné. <a href="/listings" className="underline">Choisir un véhicule</a>
          </div>
        ) : !listing ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            Ce véhicule n&apos;est plus disponible.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <p className="text-sm text-gray-500 mb-1">Véhicule sélectionné</p>
              <p className="font-semibold text-gray-900">
                {listing.vehicle ? `${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}` : 'Véhicule'}
              </p>
              <p className="text-blue-600 font-semibold mt-1">
                {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(listing.asking_price)}
              </p>
              {!listing.financeable && (
                <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Ce véhicule n&apos;est pas marqué comme finançable. La demande sera soumise à examen manuel.
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Création...' : 'Créer ma demande'}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
