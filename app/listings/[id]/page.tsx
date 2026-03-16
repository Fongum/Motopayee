import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '../../(components)/Navbar';
import Footer from '../../(components)/Footer';
import PriceBandBadge from '../../(components)/PriceBandBadge';
import ZoneBadge from '../../(components)/ZoneBadge';
import FavouriteButton from '../../(components)/FavouriteButton';
import ViewTracker from '../../(components)/ViewTracker';
import { supabaseAdmin, getCurrentUser } from '@/lib/auth/server';
import type { Listing } from '@/lib/types';
import FinancingCalculator from '../../(components)/FinancingCalculator';
import WhatsAppContactButton from '../../(components)/WhatsAppContactButton';
import WhatsAppShareButton from '../../(components)/WhatsAppShareButton';
import CompareButton from '../../(components)/CompareButton';
import SellerTrustBadge from '../../(components)/SellerTrustBadge';
import ReviewCard from '../../(components)/ReviewCard';
import ReviewForm from '../../(components)/ReviewForm';

async function getListing(id: string): Promise<Listing | null> {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(*), media:media_assets(*), seller:profiles!seller_id(is_verified, full_name, phone, avg_rating, total_reviews)')
    .eq('id', id)
    .eq('status', 'published')
    .single();
  return data as unknown as Listing | null;
}

interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  reviewer?: { full_name: string | null };
  response?: { comment: string; created_at: string; responder?: { full_name: string | null } } | null;
}

async function getReviews(sellerId: string): Promise<ReviewData[]> {
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name), response:review_responses(comment, created_at, responder:profiles!responder_id(full_name))')
    .eq('reviewed_id', sellerId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);
  return ((data ?? []) as unknown as (ReviewData & { response: ReviewData['response'][] | ReviewData['response'] })[]).map((r) => ({
    ...r,
    response: Array.isArray(r.response) && r.response.length > 0 ? r.response[0] : null,
  }));
}

// ─── Dynamic SEO metadata ──────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const listing = await getListing(params.id);
  if (!listing) return { title: 'Annonce introuvable — MotoPayee' };

  const v = listing.vehicle;
  const priceStr = listing.asking_price >= 1_000_000
    ? `${(listing.asking_price / 1_000_000).toFixed(1)}M XAF`
    : `${listing.asking_price.toLocaleString('fr-FR')} XAF`;

  const title = v
    ? `${v.year} ${v.make} ${v.model} — ${priceStr} | MotoPayee`
    : `Annonce véhicule — ${priceStr} | MotoPayee`;

  const description = [
    v ? `${v.make} ${v.model} ${v.year}` : 'Véhicule',
    v ? `${v.mileage_km.toLocaleString('fr-FR')} km` : null,
    `Zone ${listing.zone} au Cameroun`,
    `Prix: ${priceStr}`,
    listing.financeable ? 'Financement disponible via MotoPayee.' : null,
    'Véhicule inspecté et vérifié.',
  ].filter(Boolean).join(' · ');

  const imageUrl = listing.media && listing.media.length > 0
    ? `/api/files/thumb/${listing.media[0].id}`
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [listing, user] = await Promise.all([
    getListing(params.id),
    getCurrentUser().catch(() => null),
  ]);
  if (!listing) notFound();

  const reviews = await getReviews(listing.seller_id);

  // Check if buyer has saved this listing
  let isFavourited = false;
  if (user?.role === 'buyer') {
    const { data: fav } = await supabaseAdmin
      .from('favourites')
      .select('id')
      .eq('user_id', user.id)
      .eq('listing_id', listing.id)
      .maybeSingle();
    isFavourited = !!fav;
  }

  const v = listing.vehicle;

  return (
    <>
      <Navbar />
      <ViewTracker listingId={listing.id} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/listings" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
          ← Retour aux annonces
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Media */}
          <div>
            <div className="bg-gray-100 rounded-2xl h-64 md:h-96 flex items-center justify-center text-gray-400">
              {listing.media && listing.media.length > 0 ? (
                <img
                  src={`/api/files/thumb/${listing.media[0].id}`}
                  alt="Vehicle"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span>Pas de photo disponible</span>
              )}
            </div>
            {listing.media && listing.media.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {listing.media.slice(1, 6).map((m) => (
                  <div key={m.id} className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule'}
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0">
                <CompareButton item={{ id: listing.id, type: 'listing', label: v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule', image: listing.media?.[0] ? `/api/files/thumb/${listing.media[0].id}` : undefined }} />
                <ZoneBadge zone={listing.zone} />
                <FavouriteButton
                  listingId={listing.id}
                  initialSaved={isFavourited}
                  isAuthenticated={!!user}
                />
              </div>
            </div>

            {/* Seller trust badge */}
            <SellerTrustBadge
              isVerified={listing.seller?.is_verified ?? false}
              avgRating={(listing.seller as unknown as { avg_rating: number | null })?.avg_rating ?? null}
              totalReviews={(listing.seller as unknown as { total_reviews: number })?.total_reviews ?? 0}
            />

            {/* Price */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-2xl font-bold text-gray-900">{formatXAF(listing.asking_price)}</p>
                {listing.price_band && <PriceBandBadge band={listing.price_band} />}
              </div>
              {listing.suggested_price && (
                <p className="text-sm text-gray-500">
                  Prix estimé: {formatXAF(listing.mve_low ?? 0)} – {formatXAF(listing.mve_high ?? 0)}
                </p>
              )}
            </div>

            {/* Financing badge */}
            {listing.financeable && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-800 font-semibold text-sm">Ce véhicule est éligible au financement</p>
                <p className="text-green-600 text-xs mt-1">
                  Sous réserve de vérification de votre dossier par notre équipe.
                </p>
              </div>
            )}

            {/* Vehicle specs */}
            {v && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Kilométrage', value: `${v.mileage_km.toLocaleString()} km` },
                  { label: 'Carburant', value: v.fuel_type },
                  { label: 'Transmission', value: v.transmission },
                  { label: 'Couleur', value: v.color ?? '—' },
                  { label: 'Cylindrée', value: v.engine_cc ? `${v.engine_cc} cc` : '—' },
                  { label: 'Places', value: v.seats ? `${v.seats}` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-900 capitalize">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {listing.description && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
              </div>
            )}

            {/* CTA */}
            <div className="pt-2 space-y-3">
              <Link
                href={`/me/applications/new?listing=${listing.id}`}
                className="block w-full text-center bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition"
              >
                Demander un financement
              </Link>
              {listing.seller?.phone && (
                <WhatsAppContactButton
                  phone={listing.seller.phone}
                  message={`Bonjour, je suis intéressé par votre ${v ? `${v.year} ${v.make} ${v.model}` : 'véhicule'} sur MotoPayee.`}
                  label="Contacter via WhatsApp"
                  className="block w-full text-center bg-[#25D366] text-white font-semibold py-3 rounded-xl hover:bg-[#1da851] transition flex items-center justify-center gap-2"
                />
              )}
              <div className="flex gap-2">
                <WhatsAppShareButton
                  text={`Regardez ce ${v ? `${v.year} ${v.make} ${v.model}` : 'véhicule'} sur MotoPayee ! ${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing.id}`}
                />
                <Link
                  href="/login"
                  className="flex-1 text-center border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
                >
                  Contacter le vendeur
                </Link>
              </div>
            </div>

            {/* Financing calculator */}
            {listing.financeable && (
              <div className="pt-2">
                <FinancingCalculator
                  defaultPrice={listing.asking_price}
                  defaultZone={listing.zone}
                  defaultConditionGrade={listing.vehicle?.condition_grade ?? undefined}
                  defaultPriceBand={listing.price_band ?? undefined}
                  compact
                />
              </div>
            )}
          </div>
        </div>

        {/* Reviews section */}
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Avis sur le vendeur ({reviews.length})
          </h2>
          {reviews.length > 0 ? (
            <div className="space-y-3 mb-6">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-6">Aucun avis pour ce vendeur.</p>
          )}
          {user && user.id !== listing.seller_id && (
            <ReviewForm
              entityType="listing"
              entityId={listing.id}
              reviewedId={listing.seller_id}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
