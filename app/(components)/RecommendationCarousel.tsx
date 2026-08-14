'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/auth/client';
import Link from 'next/link';

interface RecommendedListing {
  id: string;
  asking_price: number;
  zone: string;
  price_band: string | null;
  vehicle: { make: string; model: string; year: number; mileage_km: number; fuel_type: string } | null;
  media: { id: string }[];
}

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

export default function RecommendationCarousel() {
  const { user } = useUser();
  const [listings, setListings] = useState<RecommendedListing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch('/api/recommendations')
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user]);

  if (!user || !loaded || listings.length === 0) return null;

  return (
    <div className="mt-14">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[#f5a623] text-xs font-bold uppercase tracking-widest">Pour vous</span>
          <h2 className="text-2xl font-extrabold text-[#1a3a6b] mt-1">Recommandations</h2>
        </div>
        <Link href="/listings" className="text-sm font-semibold text-[#3d9e3d] flex items-center gap-1 hover:gap-2 transition-all">
          Tout voir
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {listings.map((l) => (
          <Link
            key={l.id}
            href={`/listings/${l.id}`}
            className="flex-shrink-0 w-56 snap-start bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition group"
          >
            <div className="h-32 bg-gray-100 flex items-center justify-center">
              {l.media && l.media.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/thumb/${l.media[0].id}`}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-bold text-gray-900 truncate">
                {l.vehicle ? `${l.vehicle.year} ${l.vehicle.make} ${l.vehicle.model}` : 'Véhicule'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {l.vehicle ? `${l.vehicle.mileage_km.toLocaleString()} km` : ''}
              </p>
              <p className="text-sm font-extrabold text-[#1a3a6b] mt-2">{formatXAF(l.asking_price)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
