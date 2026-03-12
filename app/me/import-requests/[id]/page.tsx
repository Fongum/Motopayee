import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { ImportOffer, ImportOrder, ImportQuote, ImportRequest } from '@/lib/types';
import AcceptQuoteForm from './AcceptQuoteForm';

const REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  quoted: 'Quoted',
  accepted: 'Accepted',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  superseded: 'Superseded',
  expired: 'Expired',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

function formatXAF(value: number | string) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

type RequestWithOffer = ImportRequest & {
  offer?: Pick<ImportOffer, 'id' | 'headline' | 'status'>;
};

export default async function ImportRequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') {
    redirect('/login');
  }

  const { data: requestData } = await supabaseAdmin
    .from('import_requests')
    .select('*, offer:import_offers(id, headline, status)')
    .eq('id', params.id)
    .eq('buyer_id', user.id)
    .single();

  if (!requestData) {
    notFound();
  }

  const { data: quoteData } = await supabaseAdmin
    .from('import_quotes')
    .select('*')
    .eq('request_id', params.id)
    .order('quote_version', { ascending: false });

  const { data: orderData } = await supabaseAdmin
    .from('import_orders')
    .select('*')
    .eq('request_id', params.id)
    .maybeSingle();

  const request = requestData as RequestWithOffer;
  const quotes = (quoteData ?? []) as ImportQuote[];
  const order = orderData as ImportOrder | null;
  const activeQuote = quotes.find((quote) => quote.status === 'sent' && new Date(quote.expires_at) > new Date()) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/me/import-requests" className="text-sm font-medium text-blue-600 hover:underline">
          Back to import requests
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {request.make} {request.model ?? ''}
          </h1>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {REQUEST_STATUS_LABELS[request.status] ?? request.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Request submitted on {new Date(request.created_at).toLocaleDateString('fr-FR')} for the US corridor.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Request brief</h2>
            <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Budget</p>
                <p className="mt-1 font-medium text-gray-900">{formatXAF(request.budget_max_xaf)}</p>
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Linked offer</p>
                <p className="mt-1 font-medium text-gray-900">{request.offer?.headline || 'Custom sourcing request'}</p>
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
              <p className="mt-5 text-sm text-gray-500">MotoPayee has not issued a quote yet.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {quotes.map((quote) => (
                  <div key={quote.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-base font-semibold text-gray-900">Quote v{quote.quote_version}</p>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                            {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
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

                    <div className="mt-4 grid gap-3 text-xs text-gray-500 md:grid-cols-4">
                      <p>Vehicle: {formatXAF(quote.vehicle_price)}</p>
                      <p>Shipping: {formatXAF(quote.shipping_fee)}</p>
                      <p>Customs est.: {formatXAF(quote.estimated_customs_fee)}</p>
                      <p>Deposit: {formatXAF(quote.reservation_deposit_amount)}</p>
                    </div>

                    {quote.quote_terms && (
                      <p className="mt-4 text-sm leading-6 text-gray-600">{quote.quote_terms}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          {order ? (
            <div className="rounded-[2rem] border border-green-200 bg-green-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-green-900">Order created</h2>
              <p className="mt-3 text-sm leading-7 text-green-800">
                This request already has an active import order. Continue to the order page to handle deposit payment and tracking.
              </p>
              <Link
                href={`/me/import-orders/${order.id}`}
                className="mt-5 inline-flex rounded-xl bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"
              >
                View order
              </Link>
            </div>
          ) : (
            <>
              {activeQuote ? (
                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Accept latest quote</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Accept the current quote to create your import order and unlock the reservation deposit step.
                  </p>
                  <div className="mt-5">
                    <AcceptQuoteForm
                      quoteId={activeQuote.id}
                      reservationDepositAmount={Number(activeQuote.reservation_deposit_amount)}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900">Waiting for next step</h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    You can accept a quote here as soon as MotoPayee sends one that is still active.
                  </p>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
