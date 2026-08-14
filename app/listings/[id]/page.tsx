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
import type { Inspection, Listing } from '@/lib/types';
import FinancingCalculator from '../../(components)/FinancingCalculator';
import WhatsAppContactButton from '../../(components)/WhatsAppContactButton';
import WhatsAppShareButton from '../../(components)/WhatsAppShareButton';
import CompareButton from '../../(components)/CompareButton';
import SellerTrustBadge from '../../(components)/SellerTrustBadge';
import ReviewCard from '../../(components)/ReviewCard';
import ReviewForm from '../../(components)/ReviewForm';
import ChatWidget from '../../(components)/ChatWidget';
import InsuranceQuoteWidget from '../../(components)/InsuranceQuoteWidget';
import PhotoGallery from '../../(components)/PhotoGallery';
import JsonLd from '../../(components)/JsonLd';
import SocialShareButtons from '../../(components)/SocialShareButtons';
import { ListingTrustBadges } from '../../(components)/TrustLabelBadges';
import InspectionRequestForm from '../../(components)/InspectionRequestForm';

type PublicListing = Listing & {
  inspections?: Inspection[];
};

async function getListing(id: string): Promise<PublicListing | null> {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(*), media:media_assets(*), seller:profiles!seller_id(is_verified, full_name, phone, avg_rating, total_reviews), inspections(*)')
    .eq('id', id)
    .eq('status', 'published')
    .single();
  return data as unknown as PublicListing | null;
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
    'Annonce revue par MotoPayee.',
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

function getLatestInspection(listing: PublicListing): Inspection | null {
  const inspections = listing.inspections ?? [];
  if (inspections.length === 0) return null;
  return [...inspections].sort((a, b) => (
    new Date(b.inspected_at ?? b.created_at).getTime() - new Date(a.inspected_at ?? a.created_at).getTime()
  ))[0];
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
  const vehicleLabel = v ? `${v.year} ${v.make} ${v.model}` : 'ce vehicule';
  const hasInspection = Boolean(v?.condition_grade);
  const latestInspection = getLatestInspection(listing);

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Vehicle',
        name: v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule',
        brand: { '@type': 'Brand', name: v?.make ?? '' },
        model: v?.model ?? '',
        modelDate: String(v?.year ?? ''),
        mileageFromOdometer: v ? { '@type': 'QuantitativeValue', value: v.mileage_km, unitCode: 'KMT' } : undefined,
        fuelType: v?.fuel_type ?? undefined,
        vehicleTransmission: v?.transmission ?? undefined,
        color: v?.color ?? undefined,
        offers: {
          '@type': 'Offer',
          price: listing.asking_price,
          priceCurrency: 'XAF',
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: listing.seller?.full_name ?? 'MotoPayee',
          },
        },
        image: listing.media?.[0] ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/files/thumb/${listing.media[0].id}` : undefined,
      }} />
      <Navbar />
      <ViewTracker listingId={listing.id} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/listings" className="text-sm font-medium text-[#1a3a6b] hover:text-[#3d9e3d] transition-colors mb-6 inline-block">
          ← Retour aux annonces
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Media */}
          <div>
            <PhotoGallery
              photos={(listing.media ?? []).map((m) => ({
                id: m.id,
                src: `/api/files/thumb/${m.id}`,
                alt: v ? `${v.make} ${v.model}` : 'Véhicule',
              }))}
            />
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

            <ListingTrustBadges listing={listing} />

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
                  Sous réserve de vérification et d&apos;approbation par un partenaire de financement.
                </p>
              </div>
            )}
            {!listing.financeable && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 font-semibold text-sm">Financement non disponible pour cette annonce</p>
                <p className="text-amber-700 text-xs mt-1">
                  Seules les annonces Finance eligible peuvent recevoir une demande de financement via MotoPayee.
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
              {listing.financeable ? (
                <Link
                  href={`/me/applications/new?listing=${listing.id}`}
                  className="block w-full text-center bg-[#3d9e3d] text-white font-semibold py-3 rounded-xl hover:bg-[#2d8a2d] transition shadow-sm"
                >
                  Demander un financement
                </Link>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-medium text-gray-600">
                  Financement disponible uniquement sur les vehicules Finance eligible.
                </div>
              )}
              {listing.seller?.phone && (
                <WhatsAppContactButton
                  phone={listing.seller.phone}
                  message={`Bonjour, je suis intéressé par votre ${v ? `${v.year} ${v.make} ${v.model}` : 'véhicule'} sur MotoPayee.`}
                  label="Contacter via WhatsApp"
                  className="block w-full text-center bg-[#25D366] text-white font-semibold py-3 rounded-xl hover:bg-[#1da851] transition flex items-center justify-center gap-2"
                />
              )}
              <div className="flex gap-2 flex-wrap">
                <WhatsAppShareButton
                  text={`Regardez ce ${v ? `${v.year} ${v.make} ${v.model}` : 'véhicule'} sur MotoPayee ! ${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing.id}`}
                />
                <SocialShareButtons
                  url={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/listings/${listing.id}`}
                  title={v ? `${v.year} ${v.make} ${v.model} sur MotoPayee` : 'Véhicule sur MotoPayee'}
                  compact
                />
              </div>
              <ChatWidget
                otherUserId={listing.seller_id}
                otherUserName={listing.seller?.full_name ?? 'Vendeur'}
                listingId={listing.id}
              />
              {!hasInspection && (
                <InspectionRequestForm
                  listingId={listing.id}
                  vehicleLabel={vehicleLabel}
                  defaultName={user?.name ?? ''}
                />
              )}
            </div>

            {/* Insurance */}
            <InsuranceQuoteWidget
              vehicleValueXaf={listing.asking_price}
              listingId={listing.id}
            />

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

        {latestInspection && (
          <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Resume inspection MotoPayee</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Rapport effectue le {new Date(latestInspection.inspected_at).toLocaleDateString('fr-FR')}.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-purple-50 px-3 py-1 text-sm font-semibold text-purple-700">
                Grade {latestInspection.condition_grade}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Condition</p>
                <p className="mt-1 text-lg font-bold text-gray-900">Grade {latestInspection.condition_grade}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Financement</p>
                <p className={`mt-1 text-lg font-bold ${latestInspection.financeable ? 'text-green-700' : 'text-amber-700'}`}>
                  {latestInspection.financeable ? 'Eligible' : 'Non eligible'}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Reparations estimees</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {latestInspection.repair_estimate_low || latestInspection.repair_estimate_high
                    ? `${formatXAF(latestInspection.repair_estimate_low ?? 0)} - ${formatXAF(latestInspection.repair_estimate_high ?? latestInspection.repair_estimate_low ?? 0)}`
                    : 'Non indique'}
                </p>
              </div>
            </div>

            {latestInspection.notes && (
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">Notes inspecteur</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">{latestInspection.notes}</p>
              </div>
            )}
          </section>
        )}

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
