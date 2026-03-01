import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Listing } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  ownership_submitted: 'Docs propriété soumis',
  ownership_verified: 'Propriété vérifiée',
  media_done: 'Photos disponibles',
  inspection_scheduled: 'Inspection programmée',
  inspected: 'Inspecté',
  pricing_review: 'Révision du prix',
  published: 'Publié',
  sold: 'Vendu',
  withdrawn: 'Retiré',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ownership_submitted: 'bg-yellow-100 text-yellow-700',
  ownership_verified: 'bg-blue-100 text-blue-700',
  media_done: 'bg-blue-100 text-blue-700',
  inspection_scheduled: 'bg-purple-100 text-purple-700',
  inspected: 'bg-purple-100 text-purple-700',
  pricing_review: 'bg-orange-100 text-orange-700',
  published: 'bg-green-100 text-green-700',
  sold: 'bg-green-100 text-green-800',
  withdrawn: 'bg-gray-100 text-gray-500',
};

export default async function SellerListingsPage() {
  const user = await getCurrentUser();
  if (!user || !['seller_individual', 'seller_dealer'].includes(user.role)) redirect('/login');

  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(make, model, year)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  const items = (listings ?? []) as unknown as Listing[];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes annonces</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} annonce{items.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/me/listings/new"
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nouvelle annonce
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-500 mb-4">Vous n&apos;avez pas encore d&apos;annonce.</p>
          <Link href="/me/listings/new" className="text-blue-600 hover:underline text-sm">
            Créer ma première annonce →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((listing) => {
            const v = listing.vehicle as { make: string; model: string; year: number } | undefined;
            return (
              <Link
                key={listing.id}
                href={`/me/listings/${listing.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(listing.asking_price)}
                      {' · Zone '}{listing.zone}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Créée le {new Date(listing.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[listing.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[listing.status] ?? listing.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
