'use client';

import Link from 'next/link';
import { useRef } from 'react';

interface CarouselListing {
  id: string;
  asking_price: number;
  zone: string;
  price_band?: string | null;
  vehicle?: {
    make: string;
    model: string;
    year: number;
    mileage_km: number;
    fuel_type?: string;
  } | null;
  media?: { id: string }[];
}

function formatXAF(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M XAF`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K XAF`;
  return `${n} XAF`;
}

const BAND_COLORS: Record<string, string> = {
  green: 'text-green-600',
  yellow: 'text-amber-500',
  red: 'text-red-500',
};

export default function ListingCarousel({
  listings,
  title,
  seeAllHref,
  accent = '#3d9e3d',
}: {
  listings: CarouselListing[];
  title: string;
  seeAllHref: string;
  accent?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 'left' | 'right') {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  }

  if (listings.length === 0) return null;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#1a3a6b] flex items-center gap-2">
          <span className="w-1 h-5 rounded-full inline-block" style={{ backgroundColor: accent }} />
          {title}
        </h2>
        <Link
          href={seeAllHref}
          className="text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all"
          style={{ color: accent }}
        >
          Voir tout
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Carousel container */}
      <div className="relative group">
        {/* Left arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-16 bg-white/90 shadow-md rounded-r-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scroll track */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {listings.map((listing) => {
            const v = listing.vehicle;
            const bandColor = listing.price_band ? BAND_COLORS[listing.price_band] ?? 'text-gray-600' : 'text-gray-600';
            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="flex-shrink-0 w-40 group/card hover:-translate-y-1 transition-transform"
              >
                {/* Image */}
                <div className="w-40 h-28 bg-gray-100 rounded-xl overflow-hidden relative mb-2 border border-gray-200 group-hover/card:border-[#3d9e3d] transition-colors">
                  {listing.media && listing.media.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/thumb/${listing.media[0].id}`}
                      alt={v ? `${v.make} ${v.model}` : 'Véhicule'}
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-.001M3 7l2-3h10l2 3M13 6h5l2 4-1 1v5" />
                      </svg>
                    </div>
                  )}
                  {/* Zone badge */}
                  <span className="absolute top-1.5 left-1.5 bg-[#1a3a6b] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Zone {listing.zone}
                  </span>
                  {listing.financeable && (
                    <span className="absolute top-1.5 right-1.5 bg-[#3d9e3d] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">F</span>
                  )}
                </div>
                {/* Info */}
                <p className="text-[11px] font-bold text-[#1a3a6b] uppercase leading-tight group-hover/card:text-[#3d9e3d] transition-colors">
                  {v?.make ?? '—'} {v?.model ?? ''}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {v?.year ?? ''}{v?.mileage_km ? ` · ${(v.mileage_km / 1000).toFixed(0)}k km` : ''}
                </p>
                <p className={`text-sm font-extrabold mt-1 ${bandColor}`}>
                  {formatXAF(listing.asking_price)}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-16 bg-white/90 shadow-md rounded-l-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
