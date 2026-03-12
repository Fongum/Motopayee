import Link from 'next/link';
import Navbar from '@/app/(components)/Navbar';
import Footer from '@/app/(components)/Footer';
import { supabaseAdmin } from '@/lib/auth/server';
import type { ImportOffer } from '@/lib/types';

const FEATURES = [
  'Trusted US sourcing partner',
  'Structured quote before purchase',
  'Shipping and document tracking',
  'Buyer can self-clear or prepare for broker support',
];

function formatXAF(value: number | string) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function getOfferImage(offer: ImportOffer) {
  if (offer.cover_image_url) return offer.cover_image_url;
  const media = Array.isArray(offer.media_json) ? offer.media_json : [];
  const first = media[0] as { url?: string } | undefined;
  return first?.url ?? null;
}

export default async function ImportsLandingPage() {
  const { data } = await supabaseAdmin
    .from('import_offers')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(12);

  const offers = (data ?? []) as ImportOffer[];

  return (
    <>
      <Navbar />
      <main className="bg-white">
        <section className="relative overflow-hidden bg-[#0d1f3c] py-24 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(61,158,61,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(245,166,35,0.18),_transparent_30%)]" />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-blue-100">
                MotoPayee Assisted Import
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
                Source auction and dealer vehicles from the US with a controlled MotoPayee flow.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-blue-100">
                Start with a request, receive a transparent quote, then decide before any vehicle is purchased. This keeps the
                import process structured instead of turning it into a risky open marketplace.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/imports/request"
                  className="rounded-xl bg-[#3d9e3d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2d8a2d]"
                >
                  Request a vehicle
                </Link>
                <Link
                  href="/me/import-requests"
                  className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Track my requests
                </Link>
              </div>
            </div>

            <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Phase 1</p>
              <p className="mt-3 text-2xl font-bold">US to Cameroon only</p>
              <ul className="mt-6 space-y-3 text-sm text-blue-100">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#3d9e3d]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#3d9e3d]">Curated offers</span>
                <h2 className="mt-2 text-3xl font-bold text-[#1a3a6b]">Available now from our US partner</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                  These are controlled sourcing opportunities, not instant local stock. Each offer still goes through a quote and confirmation step before purchase.
                </p>
              </div>
              <Link
                href="/imports/request"
                className="inline-flex rounded-xl border border-[#1a3a6b] px-5 py-3 text-sm font-semibold text-[#1a3a6b] hover:bg-[#1a3a6b] hover:text-white"
              >
                Need a different car?
              </Link>
            </div>

            {offers.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                <p className="text-lg font-semibold text-gray-900">No active offers yet</p>
                <p className="mt-2 text-sm text-gray-500">
                  Start with a custom import request and the MotoPayee team will source a suitable vehicle.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {offers.map((offer) => {
                  const image = getOfferImage(offer);
                  return (
                    <Link
                      key={offer.id}
                      href={`/imports/offers/${offer.id}`}
                      className="group overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div
                        className="h-56 bg-gray-100"
                        style={image ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                      />
                      <div className="space-y-4 p-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3d9e3d]">{offer.source_type}</p>
                            <h3 className="mt-2 text-xl font-bold text-[#1a3a6b] group-hover:text-[#3d9e3d]">{offer.headline}</h3>
                          </div>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                            {offer.source_country}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Vehicle</p>
                            <p className="mt-1 font-medium text-gray-900">
                              {offer.year} {offer.make} {offer.model}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Mileage</p>
                            <p className="mt-1 font-medium text-gray-900">
                              {offer.mileage_km ? `${offer.mileage_km.toLocaleString('fr-FR')} km` : 'Not listed'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Estimated landed total</p>
                          <p className="mt-1 text-2xl font-bold text-[#1a3a6b]">{formatXAF(offer.total_estimated_xaf)}</p>
                          <p className="mt-1 text-xs text-gray-500">Includes shipping, MotoPayee fee, and estimated customs.</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
