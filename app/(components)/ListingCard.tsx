import Link from 'next/link';
import type { Listing } from '@/lib/types';

interface Props {
  listing: Listing;
}

function formatXAF(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M XAF`;
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const BAND: Record<string, { label: string; cls: string }> = {
  green:  { label: 'Bon prix',       cls: 'bg-green-50 text-green-700 border-green-200' },
  yellow: { label: 'Prix correct',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  red:    { label: 'Prix élevé',     cls: 'bg-red-50 text-red-600 border-red-200' },
};

const FUEL_FR: Record<string, string> = {
  petrol: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride', other: 'Autre',
};

export default function ListingCard({ listing }: Props) {
  const v = listing.vehicle;
  const band = listing.price_band ? BAND[listing.price_band] : null;
  const hasPhoto = listing.media && listing.media.length > 0;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block bg-white rounded-2xl border border-gray-200 hover:border-[#3d9e3d] hover:shadow-lg transition-all overflow-hidden"
    >
      {/* Photo */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {hasPhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/files/thumb/${listing.media![0].id}`}
            alt={v ? `${v.make} ${v.model}` : 'Véhicule'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-.001M3 7l2-3h10l2 3M13 6h5l2 4-1 1v5" />
            </svg>
            <span className="text-xs">Pas de photo</span>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="bg-[#1a3a6b] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
            Zone {listing.zone}
          </span>
          {listing.financeable && (
            <span className="bg-[#3d9e3d] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              Finançable
            </span>
          )}
        </div>

        {/* Photo count */}
        {hasPhoto && listing.media!.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {listing.media!.length}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-[#1a3a6b] group-hover:text-[#3d9e3d] transition-colors leading-tight text-sm mb-1">
          {v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule'}
        </h3>

        {v && (
          <p className="text-xs text-gray-400 mb-3">
            {(v.mileage_km).toLocaleString('fr-FR')} km
            {v.fuel_type ? ` · ${FUEL_FR[v.fuel_type] ?? v.fuel_type}` : ''}
            {v.condition_grade ? ` · Grade ${v.condition_grade}` : ''}
          </p>
        )}

        {listing.city && (
          <p className="text-[11px] text-gray-400 flex items-center gap-1 mb-3">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {listing.city}
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-base font-extrabold text-gray-900">{formatXAF(listing.asking_price)}</p>
          {band && (
            <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${band.cls}`}>
              {band.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
