import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '../../(components)/Navbar';
import Footer from '../../(components)/Footer';
import { supabaseAdmin, getCurrentUser } from '@/lib/auth/server';
import type { HireListing } from '@/lib/types';
import BookingForm from './BookingForm';
import WhatsAppContactButton from '../../(components)/WhatsAppContactButton';
import CallContactButton from '../../(components)/CallContactButton';
import VehicleCallbackForm from '../../(components)/VehicleCallbackForm';
import WhatsAppShareButton from '../../(components)/WhatsAppShareButton';
import CompareButton from '../../(components)/CompareButton';
import SellerTrustBadge from '../../(components)/SellerTrustBadge';
import ReviewCard from '../../(components)/ReviewCard';
import ReviewForm from '../../(components)/ReviewForm';
import ChatWidget from '../../(components)/ChatWidget';
import InsuranceQuoteWidget from '../../(components)/InsuranceQuoteWidget';
import ViewTracker from '../../(components)/ViewTracker';
import PhotoGallery from '../../(components)/PhotoGallery';
import JsonLd from '../../(components)/JsonLd';
import { HireTrustBadges } from '../../(components)/TrustLabelBadges';

type Props = { params: { id: string } };

async function getListing(id: string) {
  const { data } = await supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(id, full_name, phone, is_verified, city, avg_rating, total_reviews), media:hire_listing_media(*)')
    .eq('id', id)
    .eq('status', 'published')
    .single();
  return data as unknown as HireListing | null;
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

async function getReviews(ownerId: string): Promise<ReviewData[]> {
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(full_name), response:review_responses(comment, created_at, responder:profiles!responder_id(full_name))')
    .eq('reviewed_id', ownerId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(10);
  return ((data ?? []) as unknown as (ReviewData & { response: ReviewData['response'][] | ReviewData['response'] })[]).map((r) => ({
    ...r,
    response: Array.isArray(r.response) && r.response.length > 0 ? r.response[0] : null,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing(params.id);
  if (!listing) return { title: 'Non trouvé — MotoPayee' };
  return {
    title: `${listing.year} ${listing.make} ${listing.model} à louer — MotoPayee`,
    description: `Louez ${listing.year} ${listing.make} ${listing.model} à ${listing.city}. ${formatXAF(listing.daily_rate)}/jour.`,
  };
}

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const FUEL_FR: Record<string, string> = {
  petrol: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride', other: 'Autre',
};

const HIRE_TYPE_FR: Record<string, string> = {
  self_drive: 'Sans chauffeur',
  with_driver: 'Avec chauffeur',
  both: 'Avec ou sans chauffeur',
};

export default async function HireDetailPage({ params }: Props) {
  const [listing, user] = await Promise.all([
    getListing(params.id),
    getCurrentUser().catch(() => null),
  ]);
  if (!listing) notFound();

  const reviews = await getReviews(listing.owner_id);

  const features = Array.isArray(listing.features) ? listing.features : [];

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${listing.year} ${listing.make} ${listing.model} — Location`,
        description: listing.description ?? `Louez ${listing.year} ${listing.make} ${listing.model} à ${listing.city}`,
        brand: { '@type': 'Brand', name: listing.make },
        offers: {
          '@type': 'Offer',
          price: listing.daily_rate,
          priceCurrency: 'XAF',
          unitCode: 'DAY',
          availability: listing.availability === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      }} />
      <Navbar />
      <ViewTracker listingId={listing.id} entityType="hire_listing" />
      <main className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-400 mb-6">
            <a href="/hire" className="hover:text-[#1a3a6b]">Location</a>
            <span className="mx-2">/</span>
            <span className="text-gray-600">{listing.year} {listing.make} {listing.model}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — Photos + Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Photo gallery */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden p-3">
                <PhotoGallery
                  photos={(listing.media ?? []).map((m) => ({
                    id: m.id,
                    src: `/api/files/signed-url?path=${encodeURIComponent(m.storage_path)}&bucket=${m.bucket}`,
                    alt: `${listing.make} ${listing.model}`,
                  }))}
                />
              </div>

              {/* Vehicle details */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h1 className="text-2xl font-extrabold text-[#1a3a6b]">
                    {listing.year} {listing.make} {listing.model}
                  </h1>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <CompareButton item={{ id: listing.id, type: 'hire', label: `${listing.year} ${listing.make} ${listing.model}` }} />
                    <WhatsAppShareButton
                      text={`Louez ce ${listing.year} ${listing.make} ${listing.model} sur MotoPayee ! ${process.env.NEXT_PUBLIC_APP_URL}/hire/${listing.id}`}
                      compact
                    />
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-6 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {listing.address ? `${listing.address}, ` : ''}{listing.city} — Zone {listing.zone}
                </p>

                <HireTrustBadges listing={listing} />

                {/* Specs grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Carburant</p>
                    <p className="text-sm font-bold text-gray-800">{FUEL_FR[listing.fuel_type]}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Boîte</p>
                    <p className="text-sm font-bold text-gray-800">{listing.transmission === 'automatic' ? 'Automatique' : 'Manuelle'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Places</p>
                    <p className="text-sm font-bold text-gray-800">{listing.seats}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Type</p>
                    <p className="text-sm font-bold text-gray-800">{HIRE_TYPE_FR[listing.hire_type]}</p>
                  </div>
                  {listing.engine_cc && (
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Moteur</p>
                      <p className="text-sm font-bold text-gray-800">{listing.engine_cc} cc</p>
                    </div>
                  )}
                  {listing.color && (
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Couleur</p>
                      <p className="text-sm font-bold text-gray-800">{listing.color}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {listing.description && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-800 mb-2">Description</h2>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{listing.description}</p>
                  </div>
                )}

                {/* Features */}
                {features.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold text-gray-800 mb-2">Équipements</h2>
                    <div className="flex flex-wrap gap-2">
                      {features.map((f, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
                          {String(f)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conditions */}
                {listing.conditions && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-2">Conditions de location</h2>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{listing.conditions}</p>
                  </div>
                )}
              </div>

              {/* Owner info */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-800 mb-3">Propriétaire</h2>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#1a3a6b] rounded-full flex items-center justify-center text-white font-bold">
                    {listing.owner?.full_name?.[0] ?? '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {listing.owner?.full_name ?? 'Propriétaire'}
                    </p>
                    <SellerTrustBadge
                      isVerified={listing.owner?.is_verified ?? false}
                      avgRating={(listing.owner as unknown as { avg_rating: number | null })?.avg_rating ?? null}
                      totalReviews={(listing.owner as unknown as { total_reviews: number })?.total_reviews ?? 0}
                    />
                  </div>
                </div>
                {listing.owner?.phone && (
                  <div className="flex gap-2">
                    <WhatsAppContactButton
                      phone={listing.owner.phone}
                      message={`Bonjour, je suis intéressé par la location de votre ${listing.year} ${listing.make} ${listing.model} sur MotoPayee.`}
                      label="WhatsApp"
                      surface="hire"
                      hireListingId={listing.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-[#1da851] transition text-sm"
                    />
                    <CallContactButton
                      phone={listing.owner.phone}
                      surface="hire"
                      hireListingId={listing.id}
                      className="flex-1 text-center border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
                    />
                  </div>
                )}
                <div className="mt-3">
                  <VehicleCallbackForm
                    vehicleLabel={`${listing.year} ${listing.make} ${listing.model}`}
                    hireListingId={listing.id}
                    defaultName={user?.name ?? ''}
                  />
                </div>
                <div className="mt-3">
                  <ChatWidget
                    otherUserId={listing.owner_id}
                    otherUserName={listing.owner?.full_name ?? 'Propriétaire'}
                    hireListingId={listing.id}
                  />
                </div>
              </div>

              {/* Reviews section */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-800 mb-3">Avis ({reviews.length})</h2>
                {reviews.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {reviews.map((r) => (
                      <ReviewCard key={r.id} review={r} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-4">Aucun avis.</p>
                )}
                {user && user.id !== listing.owner_id && (
                  <ReviewForm entityType="hire_listing" entityId={listing.id} reviewedId={listing.owner_id} />
                )}
              </div>
            </div>

            {/* Right — Pricing + Booking */}
            <div className="space-y-6">
              {/* Pricing card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-20">
                <div className="mb-4">
                  <p className="text-3xl font-extrabold text-gray-900">{formatXAF(listing.daily_rate)}<span className="text-sm font-normal text-gray-400">/jour</span></p>
                </div>

                <div className="space-y-2 mb-4">
                  {listing.weekly_rate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tarif hebdomadaire</span>
                      <span className="font-semibold">{formatXAF(listing.weekly_rate)}</span>
                    </div>
                  )}
                  {listing.monthly_rate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tarif mensuel</span>
                      <span className="font-semibold">{formatXAF(listing.monthly_rate)}</span>
                    </div>
                  )}
                  {listing.deposit_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Caution</span>
                      <span className="font-semibold">{formatXAF(listing.deposit_amount)}</span>
                    </div>
                  )}
                  {listing.driver_daily_rate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Chauffeur/jour</span>
                      <span className="font-semibold">+{formatXAF(listing.driver_daily_rate)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 mb-4 space-y-1">
                  {listing.mileage_limit_per_day_km && (
                    <p className="text-xs text-gray-400">
                      Limite: {listing.mileage_limit_per_day_km} km/jour
                      {listing.extra_km_charge ? ` (${formatXAF(listing.extra_km_charge)}/km suppl.)` : ''}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Durée min: {listing.min_hire_days} jour{listing.min_hire_days > 1 ? 's' : ''}
                    {listing.max_hire_days ? ` — max: ${listing.max_hire_days} jours` : ''}
                  </p>
                  {listing.insurance_included && (
                    <p className="text-xs text-green-600 font-semibold">Assurance incluse</p>
                  )}
                </div>

                {/* Insurance */}
                <InsuranceQuoteWidget
                  vehicleValueXaf={listing.daily_rate * 30}
                  hireListingId={listing.id}
                />

                {/* Booking form */}
                <BookingForm listing={listing} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
