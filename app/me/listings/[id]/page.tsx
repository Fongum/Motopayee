import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { Listing } from '@/lib/types';

const NEXT_STEPS: Record<string, string> = {
  draft: 'Soumettez les documents de propriété pour faire vérifier votre annonce.',
  ownership_submitted: 'Notre équipe vérifie vos documents de propriété.',
  ownership_verified: 'Un agent de terrain va photographier votre véhicule.',
  media_done: 'Un inspecteur va évaluer le véhicule.',
  inspection_scheduled: "L'inspection est programmée.",
  inspected: "L'équipe révise le prix estimé.",
  pricing_review: "L'équipe prépare la publication.",
  published: 'Votre annonce est visible par tous les acheteurs !',
  sold: 'Félicitations ! Votre véhicule est vendu.',
  withdrawn: "Cette annonce a été retirée.",
};

export default async function SellerListingDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !['seller_individual', 'seller_dealer'].includes(user.role)) redirect('/login');

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(*), documents(*)')
    .eq('id', params.id)
    .eq('seller_id', user.id)
    .single();

  if (error || !data) notFound();

  const listing = data as unknown as Listing;
  const v = listing.vehicle;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/me/listings" className="text-sm text-blue-600 hover:underline">← Mes annonces</Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {v ? `${v.year} ${v.make} ${v.model}` : 'Annonce'}
        </h1>
      </div>

      {/* Status card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-500">Statut</span>
          <span className="bg-blue-100 text-blue-700 text-sm font-medium px-3 py-1 rounded-full capitalize">
            {listing.status.replace(/_/g, ' ')}
          </span>
        </div>
        {NEXT_STEPS[listing.status] && (
          <p className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
            {NEXT_STEPS[listing.status]}
          </p>
        )}
      </div>

      {/* Pricing */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Prix</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Prix demandé</p>
            <p className="font-semibold text-gray-900 text-lg">
              {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(listing.asking_price)}
            </p>
          </div>
          {listing.suggested_price && (
            <div>
              <p className="text-gray-500">Prix suggéré</p>
              <p className="font-semibold text-gray-900 text-lg">
                {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(listing.suggested_price)}
              </p>
            </div>
          )}
          {listing.mve_low && listing.mve_high && (
            <div className="col-span-2">
              <p className="text-gray-500">Fourchette estimée (MVE)</p>
              <p className="text-gray-700">
                {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(listing.mve_low)}
                {' – '}
                {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(listing.mve_high)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      {listing.status === 'draft' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Documents de propriété</h2>
          <p className="text-sm text-gray-500 mb-4">
            Téléversez le titre de propriété du véhicule pour démarrer la vérification.
          </p>
          <OwnershipUploadForm listingId={listing.id} />
        </div>
      )}
    </div>
  );
}

function OwnershipUploadForm({ listingId }: { listingId: string }) {
  return (
    <form
      action={`/api/seller/listings/${listingId}/submit`}
      method="POST"
      className="space-y-4"
    >
      <p className="text-sm text-gray-500">
        Utilisez le portail web pour téléverser vos documents puis cliquez sur &quot;Soumettre&quot;.
      </p>
      <button
        type="submit"
        className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700"
      >
        Soumettre pour vérification
      </button>
    </form>
  );
}
