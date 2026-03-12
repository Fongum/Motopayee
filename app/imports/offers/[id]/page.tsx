import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/app/(components)/Navbar';
import Footer from '@/app/(components)/Footer';
import { supabaseAdmin } from '@/lib/auth/server';
import type { ImportOffer } from '@/lib/types';

function formatXAF(value: number | string) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function getMedia(offer: ImportOffer) {
  const media = Array.isArray(offer.media_json) ? offer.media_json : [];
  const urls = media
    .map((item) => (item as { url?: string }).url)
    .filter((item): item is string => Boolean(item));

  if (offer.cover_image_url && !urls.includes(offer.cover_image_url)) {
    urls.unshift(offer.cover_image_url);
  }

  return urls;
}

export default async function ImportOfferDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data } = await supabaseAdmin
    .from('import_offers')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single();

  if (!data) {
    notFound();
  }

  const offer = data as ImportOffer;
  const media = getMedia(offer);
  const requestHref = `/imports/request?offer_id=${offer.id}&make=${encodeURIComponent(offer.make)}&model=${encodeURIComponent(offer.model)}&year_min=${offer.year}&year_max=${offer.year}&budget_max_xaf=${Math.round(Number(offer.total_estimated_xaf))}`;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
          <Link href="/imports" className="inline-flex text-sm font-medium text-blue-600 hover:underline">
            Back to import offers
          </Link>

          <section className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
              <div
                className="h-[28rem] bg-gray-100"
                style={media[0] ? { backgroundImage: `url(${media[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              />
              {media.length > 1 && (
                <div className="grid grid-cols-3 gap-3 p-4">
                  {media.slice(1, 4).map((url) => (
                    <div
                      key={url}
                      className="h-24 rounded-2xl bg-gray-100"
                      style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    />
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  {offer.source_country} {offer.source_type}
                </span>
                <h1 className="mt-4 text-3xl font-bold text-[#1a3a6b]">{offer.headline}</h1>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {offer.condition_summary || 'MotoPayee sourced offer backed by a trusted US partner. Final purchase only happens after quote acceptance.'}
                </p>

                <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Estimated landed total</p>
                  <p className="mt-1 text-3xl font-bold text-[#1a3a6b]">{formatXAF(offer.total_estimated_xaf)}</p>
                  <p className="mt-2 text-xs text-gray-500">Includes logistics estimates and MotoPayee fee. Customs remain estimates until final processing.</p>
                </div>

                <div className="mt-6 grid gap-4 text-sm text-gray-600 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Vehicle</p>
                    <p className="mt-1 font-medium text-gray-900">{offer.year} {offer.make} {offer.model}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Mileage</p>
                    <p className="mt-1 font-medium text-gray-900">
                      {offer.mileage_km ? `${offer.mileage_km.toLocaleString('fr-FR')} km` : 'Not listed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Fuel / transmission</p>
                    <p className="mt-1 font-medium text-gray-900">
                      {[offer.fuel_type, offer.transmission].filter(Boolean).join(' / ') || 'Not listed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Title status</p>
                    <p className="mt-1 font-medium text-gray-900">{offer.title_status || 'Not listed'}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={requestHref}
                    className="rounded-xl bg-[#3d9e3d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2d8a2d]"
                  >
                    Request this vehicle
                  </Link>
                  <Link
                    href="/imports/request"
                    className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Request another model
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Cost breakdown</h2>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  {[
                    ['Vehicle price', offer.vehicle_price],
                    ['Auction fee', offer.auction_fee],
                    ['Inland transport', offer.inland_transport_fee],
                    ['Shipping', offer.shipping_fee],
                    ['Insurance', offer.insurance_fee],
                    ['Documentation', offer.documentation_fee],
                    ['MotoPayee fee', offer.motopayee_fee],
                    ['Estimated customs', offer.estimated_customs_fee],
                    ['Estimated port fee', offer.estimated_port_fee],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span>{label}</span>
                      <span className="font-medium text-gray-900">{formatXAF(value as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {offer.damage_summary && (
                <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-amber-900">Damage summary</h2>
                  <p className="mt-3 text-sm leading-7 text-amber-800">{offer.damage_summary}</p>
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
