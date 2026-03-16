import Link from 'next/link';
import type { HireListing } from '@/lib/types';
import WhatsAppShareButton from './WhatsAppShareButton';
import CompareButton from './CompareButton';
import StarRating from './StarRating';

interface Props {
  listing: HireListing;
}

function formatXAF(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M XAF`;
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const FUEL_FR: Record<string, string> = {
  petrol: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride', other: 'Autre',
};

const HIRE_TYPE_FR: Record<string, string> = {
  self_drive: 'Sans chauffeur',
  with_driver: 'Avec chauffeur',
  both: 'Avec/Sans chauffeur',
};

const AVAIL: Record<string, { label: string; cls: string }> = {
  available:    { label: 'Disponible',   cls: 'bg-green-50 text-green-700 border-green-200' },
  hired_out:    { label: 'En location',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  maintenance:  { label: 'Maintenance',  cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  unavailable:  { label: 'Indisponible', cls: 'bg-red-50 text-red-600 border-red-200' },
};

export default function HireCard({ listing }: Props) {
  const hasPhoto = listing.media && listing.media.length > 0;
  const avail = AVAIL[listing.availability] ?? AVAIL.unavailable;

  return (
    <Link
      href={`/hire/${listing.id}`}
      className="group block bg-white rounded-2xl border border-gray-200 hover:border-[#3d9e3d] hover:shadow-lg transition-all overflow-hidden"
    >
      {/* Photo */}
      <div className="relative h-44 bg-gray-100 overflow-hidden">
        {hasPhoto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/files/signed-url?path=${encodeURIComponent(listing.media![0].storage_path)}&bucket=${listing.media![0].bucket}`}
            alt={`${listing.make} ${listing.model}`}
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

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="bg-[#1a3a6b] text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
            Zone {listing.zone}
          </span>
          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md ${avail.cls}`}>
            {avail.label}
          </span>
        </div>

        {/* Hire type badge */}
        <div className="absolute bottom-2 left-2">
          <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
            {HIRE_TYPE_FR[listing.hire_type] ?? listing.hire_type}
          </span>
        </div>

        {hasPhoto && listing.media!.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {listing.media!.length}
          </div>
        )}

        {/* Action overlays */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <CompareButton item={{ id: listing.id, type: 'hire', label: `${listing.year} ${listing.make} ${listing.model}` }} compact />
          <WhatsAppShareButton
            text={`${listing.year} ${listing.make} ${listing.model} à louer sur MotoPayee ${typeof window !== 'undefined' ? window.location.origin : ''}/hire/${listing.id}`}
            compact
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-[#1a3a6b] group-hover:text-[#3d9e3d] transition-colors leading-tight text-sm mb-1">
          {listing.year} {listing.make} {listing.model}
        </h3>

        <p className="text-xs text-gray-400 mb-2">
          {FUEL_FR[listing.fuel_type] ?? listing.fuel_type} · {listing.transmission === 'automatic' ? 'Auto' : 'Manuel'} · {listing.seats} places
        </p>

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
          <div>
            <p className="text-base font-extrabold text-gray-900">{formatXAF(listing.daily_rate)}<span className="text-xs font-normal text-gray-400">/jour</span></p>
            {listing.weekly_rate && (
              <p className="text-[11px] text-gray-400">{formatXAF(listing.weekly_rate)}/sem</p>
            )}
          </div>
          {listing.insurance_included && (
            <span className="text-[10px] font-semibold border px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border-blue-200">
              Assuré
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {listing.owner?.is_verified && (
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] font-semibold text-blue-600">Vérifié</span>
            </div>
          )}
          {(listing.owner as unknown as { avg_rating: number | null })?.avg_rating != null && (
            <StarRating
              rating={(listing.owner as unknown as { avg_rating: number }).avg_rating}
              count={(listing.owner as unknown as { total_reviews: number }).total_reviews}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
