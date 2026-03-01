import Link from 'next/link';
import PriceBandBadge from './PriceBandBadge';
import ZoneBadge from './ZoneBadge';
import type { Listing } from '@/lib/types';

interface Props {
  listing: Listing;
}

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ListingCard({ listing }: Props) {
  const vehicle = listing.vehicle;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Thumbnail placeholder */}
      <div className="bg-gray-100 h-44 flex items-center justify-center text-gray-400 text-sm">
        {listing.media && listing.media.length > 0 ? (
          <img
            src={`/api/files/thumb/${listing.media[0].id}`}
            alt={vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>No photo</span>
        )}
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 leading-tight">
            {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle'}
          </h3>
          <ZoneBadge zone={listing.zone} />
        </div>

        {vehicle && (
          <p className="text-xs text-gray-500">
            {vehicle.mileage_km.toLocaleString()} km · {vehicle.fuel_type} · {vehicle.transmission}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <p className="text-lg font-bold text-gray-900">
            {formatXAF(listing.asking_price)}
          </p>
          <div className="flex items-center gap-2">
            {listing.price_band && <PriceBandBadge band={listing.price_band} />}
            {listing.financeable && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                Finançable
              </span>
            )}
          </div>
        </div>

        {listing.city && (
          <p className="text-xs text-gray-400">{listing.city}</p>
        )}
      </div>
    </Link>
  );
}
