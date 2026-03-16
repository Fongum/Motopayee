'use client';

import Link from 'next/link';
import { useRef } from 'react';
import type { HireListing } from '@/lib/types';

function formatXAF(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

const HIRE_TYPE_SHORT: Record<string, string> = {
  self_drive: 'Self-drive',
  with_driver: 'Chauffeur',
  both: 'Les 2',
};

export default function HireCarousel({
  listings,
  title,
  seeAllHref,
  accent = '#f5a623',
}: {
  listings: HireListing[];
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
      {/* Header */}
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

      {/* Carousel */}
      <div className="relative group">
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-16 bg-white/90 shadow-md rounded-r-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {listings.map((listing) => {
            const hasPhoto = listing.media && listing.media.length > 0;
            return (
              <Link
                key={listing.id}
                href={`/hire/${listing.id}`}
                className="flex-shrink-0 w-48 group/card hover:-translate-y-1 transition-transform"
              >
                {/* Image */}
                <div className="w-48 h-32 bg-gray-100 rounded-xl overflow-hidden relative mb-2 border border-gray-200 group-hover/card:border-[#f5a623] transition-colors">
                  {hasPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/files/signed-url?path=${encodeURIComponent(listing.media![0].storage_path)}&bucket=${listing.media![0].bucket}`}
                      alt={`${listing.make} ${listing.model}`}
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
                  {/* Badges */}
                  <span className="absolute top-1.5 left-1.5 bg-[#f5a623] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {HIRE_TYPE_SHORT[listing.hire_type]}
                  </span>
                  {listing.availability === 'available' && (
                    <span className="absolute top-1.5 right-1.5 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Dispo
                    </span>
                  )}
                </div>
                {/* Info */}
                <p className="text-[11px] font-bold text-[#1a3a6b] uppercase leading-tight group-hover/card:text-[#f5a623] transition-colors">
                  {listing.make} {listing.model}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {listing.year} · {listing.city}
                </p>
                <p className="text-sm font-extrabold mt-1 text-[#f5a623]">
                  {formatXAF(listing.daily_rate)} XAF<span className="text-[10px] font-normal text-gray-400">/jour</span>
                </p>
              </Link>
            );
          })}
        </div>

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
