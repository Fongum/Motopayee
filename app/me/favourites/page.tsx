import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import ListingCard from '../../(components)/ListingCard';
import type { Listing } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Mes favoris — MotoPayee',
};

export default async function FavouritesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') redirect('/login');

  const { data: favRows } = await supabaseAdmin
    .from('favourites')
    .select(
      'created_at, listing:listings(*, vehicle:vehicles(*), media:media_assets(*), seller:profiles!seller_id(is_verified))'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const listings = ((favRows ?? []) as unknown as { listing: Listing }[])
    .map((r) => r.listing)
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
          <p className="text-sm text-gray-500 mt-1">
            {listings.length} véhicule{listings.length !== 1 ? 's' : ''} sauvegardé{listings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/listings"
          className="text-sm font-medium text-[#1a3a6b] border border-[#1a3a6b]/30 px-3 py-1.5 rounded-lg hover:bg-[#1a3a6b]/5 transition"
        >
          Parcourir les annonces
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-semibold mb-1">{"Aucun favori pour l'instant"}</p>
          <p className="text-gray-400 text-sm mb-6">
            {"Sauvegardez des annonces en cliquant sur \u2665 Sauvegarder sur chaque fiche véhicule."}
          </p>
          <Link
            href="/listings"
            className="inline-flex items-center bg-[#3d9e3d] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#2d8a2d] transition text-sm"
          >
            Parcourir les véhicules
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
