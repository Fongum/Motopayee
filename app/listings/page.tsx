import { Suspense } from 'react';
import type { Metadata } from 'next';
import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import ListingCard from '../(components)/ListingCard';
import SearchFilters from './SearchFilters';
import { supabaseAdmin } from '@/lib/auth/server';
import { reportError } from '@/lib/error-reporting';
import {
  LISTINGS_PAGE_SIZE,
  LISTING_CARD_SELECT,
  applyListingSearch,
  listingRange,
  parseListingSearch,
} from '@/lib/listing-query';
import type { ListingQuery, ListingSearchParams, RawSearchParams } from '@/lib/listing-query';
import type { Listing } from '@/lib/types';

// ─── SEO Metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Véhicules disponibles — MotoPayee',
  description: 'Parcourez des centaines de véhicules inspectés et vérifiés au Cameroun. Filtrez par marque, zone, prix, kilométrage et carburant. Financement disponible.',
  openGraph: {
    title: 'Acheter un véhicule au Cameroun — MotoPayee',
    description: 'Marketplace automobile #1 au Cameroun. Véhicules inspectés, prix transparents, financement facilité.',
    type: 'website',
  },
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getListings(params: ListingSearchParams) {
  const [from, to] = listingRange(params.page);

  const query = supabaseAdmin
    .from('listings')
    .select(LISTING_CARD_SELECT, { count: 'exact' })
    .eq('status', 'published');

  // One query: the vehicle filters ride the inner join declared in the select.
  // A card shows a single thumbnail, so only the primary photo is embedded.
  const shaped = applyListingSearch(
    query as unknown as ListingQuery,
    params,
    { mediaLimit: 1 }
  ) as unknown as typeof query;

  const { data, count, error } = await shaped.range(from, to);

  if (error) {
    reportError(error, { route: '/listings', context: 'browse query' });
    return { listings: [] as Listing[], total: 0, failed: true };
  }

  return { listings: (data ?? []) as unknown as Listing[], total: count ?? 0, failed: false };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ListingsPage({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListingSearch(searchParams);
  const page = params.page;
  const { listings, total, failed } = await getListings(params);
  const totalPages = Math.ceil(total / LISTINGS_PAGE_SIZE);

  // Build pagination href
  function pageHref(p: number) {
    const sp = new URLSearchParams(searchParams as Record<string, string>);
    sp.set('page', String(p));
    return `/listings?${sp.toString()}`;
  }

  return (
    <>
      <Navbar />
      <main className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1a3a6b] to-[#0d1f3c] py-10 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Véhicules disponibles</h1>
            <p className="text-blue-300/80 text-sm">
              {total > 0
                ? `${total} véhicule${total > 1 ? 's' : ''} inspecté${total > 1 ? 's' : ''}, vérifié${total > 1 ? 's' : ''} et prêt${total > 1 ? 's' : ''} à financer`
                : 'Tous nos véhicules sont inspectés, vérifiés et prêts à financer'}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Filters — wrapped in Suspense because SearchFilters uses useSearchParams */}
          <Suspense fallback={<div className="h-24 bg-white rounded-2xl animate-pulse mb-6" />}>
            <div className="mb-6">
              <SearchFilters total={total} />
            </div>
          </Suspense>

          {/* Active filter chips */}
          {Object.entries(searchParams).filter(([k, v]) => k !== 'page' && v).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {Object.entries(searchParams)
                .filter(([k, v]) => k !== 'page' && v)
                .map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5 bg-[#1a3a6b]/10 text-[#1a3a6b] text-xs font-semibold px-3 py-1 rounded-full">
                    {k.replace(/_/g, ' ')}: {v}
                  </span>
                ))}
            </div>
          )}

          {/* Grid */}
          {listings.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold mb-1">
                {failed ? 'Recherche momentanément indisponible' : 'Aucun véhicule trouvé'}
              </p>
              <p className="text-gray-500 text-sm">
                {failed
                  ? 'Un incident technique nous empêche de charger les véhicules. Réessayez dans un instant.'
                  : 'Essayez de modifier vos critères de recherche.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={pageHref(page - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 hover:border-[#3d9e3d] transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Précédent
                </a>
              )}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page - 2 + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <a
                      key={p}
                      href={pageHref(p)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition ${
                        p === page
                          ? 'bg-[#1a3a6b] text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-[#3d9e3d]'
                      }`}
                    >
                      {p}
                    </a>
                  );
                })}
              </div>
              {page < totalPages && (
                <a
                  href={pageHref(page + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 hover:border-[#3d9e3d] transition flex items-center gap-2"
                >
                  Suivant
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
