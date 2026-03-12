import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { ImportQuote, ImportRequest } from '@/lib/types';
import QuoteComposer from './QuoteComposer';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  quoted: 'Quoted',
  accepted: 'Accepted',
  cancelled: 'Cancelled',
  expired: 'Expired',
  sent: 'Sent',
  superseded: 'Superseded',
  rejected: 'Rejected',
};

function formatXAF(value: number | string) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

type RequestWithBuyer = ImportRequest & {
  buyer?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
  };
};

type QuoteWithCreator = ImportQuote & {
  creator?: {
    full_name?: string | null;
    email?: string | null;
  };
};

export default async function AdminImportRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: requestData } = await supabaseAdmin
    .from('import_requests')
    .select('*, buyer:profiles!buyer_id(id, full_name, email, phone, city)')
    .eq('id', params.id)
    .single();

  if (!requestData) {
    notFound();
  }

  const { data: quoteData } = await supabaseAdmin
    .from('import_quotes')
    .select('*, creator:profiles!created_by(id, full_name, email)')
    .eq('request_id', params.id)
    .order('quote_version', { ascending: false });

  const { data: orderData } = await supabaseAdmin
    .from('import_orders')
    .select('id, status')
    .eq('request_id', params.id)
    .maybeSingle();

  const request = requestData as RequestWithBuyer;
  const quotes = (quoteData ?? []) as QuoteWithCreator[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/imports/requests" className="text-sm font-medium text-blue-600 hover:underline">
            Back to requests
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {request.make} {request.model ?? ''}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Buyer request for assisted import sourcing.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {STATUS_LABELS[request.status] ?? request.status}
        </span>
      </div>
      {orderData && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          This request already has an order in status <span className="font-semibold">{orderData.status.replace(/_/g, ' ')}</span>.{' '}
          <Link href={`/admin/imports/orders/${orderData.id}`} className="font-semibold underline">
            Open order
          </Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Buyer brief</h2>
            <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Buyer</p>
                <p className="mt-1 font-medium text-gray-900">{request.buyer?.full_name || 'Unknown buyer'}</p>
                <p className="text-gray-500">{request.buyer?.email}</p>
                {request.buyer?.phone && <p className="text-gray-500">{request.buyer.phone}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Budget</p>
                <p className="mt-1 font-medium text-gray-900">{formatXAF(request.budget_max_xaf)}</p>
                <p className="text-gray-500">{request.source_country} corridor</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Year range</p>
                <p className="mt-1 font-medium text-gray-900">
                  {request.year_min ?? 'Any'} - {request.year_max ?? 'Any'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Preferences</p>
                <p className="mt-1 font-medium text-gray-900">
                  {[request.body_type, request.fuel_type, request.transmission].filter(Boolean).join(' / ') || 'Open'}
                </p>
              </div>
              {request.color_preferences && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Colors</p>
                  <p className="mt-1 font-medium text-gray-900">{request.color_preferences}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Submitted</p>
                <p className="mt-1 font-medium text-gray-900">
                  {new Date(request.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
            </div>

            {request.notes && (
              <div className="mt-5 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                <p className="mt-2 text-sm leading-7 text-gray-700">{request.notes}</p>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Quote history</h2>
              <span className="text-xs font-medium text-gray-400">{quotes.length} quotes</span>
            </div>

            {quotes.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No quotes created yet.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {quotes.map((quote) => (
                  <div key={quote.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-base font-semibold text-gray-900">Quote v{quote.quote_version}</p>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                            {STATUS_LABELS[quote.status] ?? quote.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{quote.partner_name}</p>
                      </div>
                      <div className="text-sm sm:text-right">
                        <p className="font-semibold text-gray-900">{formatXAF(quote.total_estimated_xaf)}</p>
                        <p className="text-xs text-gray-500">
                          Expires {new Date(quote.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-xs text-gray-500 md:grid-cols-3">
                      <p>Vehicle: {formatXAF(quote.vehicle_price)}</p>
                      <p>Shipping: {formatXAF(quote.shipping_fee)}</p>
                      <p>Customs est.: {formatXAF(quote.estimated_customs_fee)}</p>
                      <p>Deposit: {formatXAF(quote.reservation_deposit_amount)}</p>
                    </div>

                    {quote.quote_terms && (
                      <p className="mt-4 text-sm leading-6 text-gray-600">{quote.quote_terms}</p>
                    )}

                    <p className="mt-4 text-xs text-gray-400">
                      Created by {quote.creator?.full_name || quote.creator?.email || 'Unknown user'} on{' '}
                      {new Date(quote.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Create quote</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Create a new quote version for this request. Any currently sent quote will be marked as superseded.
            </p>
            <div className="mt-5">
              <QuoteComposer requestId={request.id} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
