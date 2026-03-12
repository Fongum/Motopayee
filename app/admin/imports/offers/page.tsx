import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { ImportOffer } from '@/lib/types';
import AdminOfferForm from './AdminOfferForm';

function formatXAF(value: number | string) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  reserved: 'bg-blue-100 text-blue-700',
  withdrawn: 'bg-gray-100 text-gray-600',
  expired: 'bg-red-100 text-red-700',
};

export default async function AdminImportOffersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data } = await supabaseAdmin
    .from('import_offers')
    .select('*')
    .order('created_at', { ascending: false });

  const offers = (data ?? []) as ImportOffer[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import offers</h1>
          <p className="mt-1 text-sm text-gray-500">Curated US inventory published into the assisted-import catalog.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/imports/requests"
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Requests
          </Link>
          <Link
            href="/admin/imports/orders"
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Orders
          </Link>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            Offers
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Current offers</h2>
            <span className="text-xs font-medium text-gray-400">{offers.length} total</span>
          </div>

          {offers.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">No offers created yet.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {offers.map((offer) => (
                <div key={offer.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-base font-semibold text-gray-900">{offer.headline}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[offer.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {offer.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {offer.year} {offer.make} {offer.model} · {offer.source_type} · {offer.partner_name}
                      </p>
                    </div>
                    <div className="text-sm sm:text-right">
                      <p className="font-semibold text-gray-900">{formatXAF(offer.total_estimated_xaf)}</p>
                      <p className="text-xs text-gray-500">Estimated landed total</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-gray-500 md:grid-cols-3">
                    <p>Vehicle: {formatXAF(offer.vehicle_price)}</p>
                    <p>Shipping: {formatXAF(offer.shipping_fee)}</p>
                    <p>Customs est.: {formatXAF(offer.estimated_customs_fee)}</p>
                  </div>

                  {offer.condition_summary && (
                    <p className="mt-4 text-sm leading-6 text-gray-600">{offer.condition_summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create offer</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Publish a curated vehicle from your US sourcing partner into the assisted-import catalog.
          </p>
          <div className="mt-5">
            <AdminOfferForm />
          </div>
        </aside>
      </div>
    </div>
  );
}
