import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import Navbar from '../../(components)/Navbar';
import Footer from '../../(components)/Footer';
import PriceBandBadge from '../../(components)/PriceBandBadge';
import ZoneBadge from '../../(components)/ZoneBadge';
import { supabaseAdmin } from '@/lib/auth/server';
import type { Listing } from '@/lib/types';
import FinancingCalculator from '../../(components)/FinancingCalculator';

async function getListing(id: string): Promise<Listing | null> {
  const { data } = await supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(*), media:media_assets(*)')
    .eq('id', id)
    .eq('status', 'published')
    .single();
  return data as unknown as Listing | null;
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
  const listing = await getListing(params.id);
  if (!listing) notFound();

  const v = listing.vehicle;

  return (
    <>
      <Navbar />
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
              <ZoneBadge zone={listing.zone} />
            </div>

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
              <Link
                href="/login"
                className="block w-full text-center border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition"
              >
                Contacter le vendeur
              </Link>
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
      </main>
      <Footer />
    </>
  );
}
