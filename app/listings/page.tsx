import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import ListingCard from '../(components)/ListingCard';
import type { Listing } from '@/lib/types';

interface SearchParams {
  zone?: string;
  make?: string;
  model?: string;
  min_price?: string;
  max_price?: string;
  page?: string;
}

async function getListings(params: SearchParams) {
  const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL}/api/listings`);
  if (params.zone) url.searchParams.set('zone', params.zone);
  if (params.make) url.searchParams.set('make', params.make);
  if (params.model) url.searchParams.set('model', params.model);
  if (params.min_price) url.searchParams.set('min_price', params.min_price);
  if (params.max_price) url.searchParams.set('max_price', params.max_price);
  if (params.page) url.searchParams.set('page', params.page);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return { listings: [], total: 0 };
    return res.json() as Promise<{ listings: Listing[]; total: number }>;
  } catch {
    return { listings: [], total: 0 };
  }
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { listings, total } = await getListings(searchParams);
  const page = parseInt(searchParams.page ?? '1', 10);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Véhicules disponibles</h1>
          <p className="text-gray-500 mt-1">{total} véhicule{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}</p>
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-3 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <select name="zone" defaultValue={searchParams.zone ?? ''} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Toutes les zones</option>
            <option value="A">Zone A — Grandes villes</option>
            <option value="B">Zone B — Villes secondaires</option>
            <option value="C">Zone C — Rural</option>
          </select>
          <input
            name="make"
            defaultValue={searchParams.make ?? ''}
            placeholder="Marque (ex. Toyota)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="model"
            defaultValue={searchParams.model ?? ''}
            placeholder="Modèle (ex. Corolla)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            name="min_price"
            type="number"
            defaultValue={searchParams.min_price ?? ''}
            placeholder="Prix min (XAF)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36"
          />
          <input
            name="max_price"
            type="number"
            defaultValue={searchParams.max_price ?? ''}
            placeholder="Prix max (XAF)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36"
          />
          <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700">
            Filtrer
          </button>
        </form>

        {/* Grid */}
        {listings.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">Aucun véhicule trouvé.</p>
            <p className="text-sm mt-2">Essayez de modifier vos critères de recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-10 flex gap-3 justify-center">
            {page > 1 && (
              <a href={`?page=${page - 1}`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Précédent
              </a>
            )}
            {listings.length === 20 && (
              <a href={`?page=${page + 1}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Suivant
              </a>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
