import Navbar from '../(components)/Navbar';
import Footer from '../(components)/Footer';
import ListingCard from '../(components)/ListingCard';
import { supabaseAdmin } from '@/lib/auth/server';
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
  const page = parseInt(params.page ?? '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(*), media:media_assets(*)', { count: 'exact' })
    .eq('status', 'published');

  if (params.zone) query = query.eq('zone', params.zone);
  if (params.make) query = query.ilike('vehicle.make', `%${params.make}%`);
  if (params.model) query = query.ilike('vehicle.model', `%${params.model}%`);
  if (params.min_price) query = query.gte('asking_price', parseFloat(params.min_price));
  if (params.max_price) query = query.lte('asking_price', parseFloat(params.max_price));

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { listings: (data ?? []) as unknown as Listing[], total: count ?? 0 };
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = parseInt(searchParams.page ?? '1', 10);
  const { listings, total } = await getListings(searchParams);

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
