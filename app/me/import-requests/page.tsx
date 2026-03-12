import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { ImportOrder, ImportQuote, ImportRequest } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  quoted: 'Quoted',
  accepted: 'Accepted',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

function formatXAF(value: number | string) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function MyImportRequestsPage({
  searchParams,
}: {
  searchParams: { submitted?: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') {
    redirect('/login');
  }

  const { data: requestData } = await supabaseAdmin
    .from('import_requests')
    .select('*')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  const requests = (requestData ?? []) as ImportRequest[];
  const requestIds = requests.map((item) => item.id);

  const latestQuotesByRequest = new Map<string, ImportQuote>();
  const ordersByRequest = new Map<string, ImportOrder>();
  if (requestIds.length > 0) {
    const { data: quoteData } = await supabaseAdmin
      .from('import_quotes')
      .select('*')
      .in('request_id', requestIds)
      .order('created_at', { ascending: false });

    for (const quote of (quoteData ?? []) as ImportQuote[]) {
      if (!latestQuotesByRequest.has(quote.request_id)) {
        latestQuotesByRequest.set(quote.request_id, quote);
      }
    }

    const { data: orderData } = await supabaseAdmin
      .from('import_orders')
      .select('*')
      .in('request_id', requestIds);

    for (const order of (orderData ?? []) as ImportOrder[]) {
      ordersByRequest.set(order.request_id, order);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My import requests</h1>
          <p className="mt-1 text-sm text-gray-500">
            Follow requests submitted to the MotoPayee assisted-import team.
          </p>
        </div>
        <Link
          href="/imports/request"
          className="inline-flex items-center justify-center rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50]"
        >
          New request
        </Link>
      </div>

      {searchParams.submitted === '1' && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
          Your import request has been sent. MotoPayee will review it and issue a quote if the sourcing window is viable.
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No import requests yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Start with a vehicle request and we will source it through the assisted-import workflow.
          </p>
          <Link
            href="/imports/request"
            className="mt-6 inline-flex rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50]"
          >
            Submit a request
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const latestQuote = latestQuotesByRequest.get(request.id);
            const order = ordersByRequest.get(request.id);
            return (
              <div key={request.id} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {request.make} {request.model ?? ''}
                      </h2>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {STATUS_LABELS[request.status] ?? request.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      US import request created on {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>

                  <div className="text-sm text-gray-600 sm:text-right">
                    <p className="font-semibold text-gray-900">{formatXAF(request.budget_max_xaf)}</p>
                    <p>Budget ceiling</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 md:grid-cols-3">
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Latest quote</p>
                    {latestQuote ? (
                      <>
                        <p className="mt-1 font-medium text-gray-900">{formatXAF(latestQuote.total_estimated_xaf)}</p>
                        <p className="text-xs text-gray-500">
                          Version {latestQuote.quote_version} · expires {new Date(latestQuote.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 font-medium text-gray-900">Pending review</p>
                    )}
                  </div>
                </div>

                {request.notes && (
                  <p className="mt-4 text-sm leading-6 text-gray-600">{request.notes}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/me/import-requests/${request.id}`}
                    className="inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    View details
                  </Link>
                  {order && (
                    <Link
                      href={`/me/import-orders/${order.id}`}
                      className="inline-flex rounded-xl bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132b50]"
                    >
                      View order
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
