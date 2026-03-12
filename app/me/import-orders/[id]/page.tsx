import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { ImportDocument, ImportOrder, ImportPayment, ImportQuote, ImportRequest, ImportShipment, Profile } from '@/lib/types';
import ImportPaymentRequestForm from './ImportPaymentRequestForm';

function formatXAF(value: number | string | null) {
  if (value == null) return '-';
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

const ORDER_STEPS = [
  'deposit_pending',
  'deposit_paid',
  'shipping_booked',
  'in_transit',
  'arrived_cameroon',
  'ready_for_clearing',
  'completed',
];

const ORDER_PROGRESS_INDEX: Record<string, number> = {
  quote_sent: 0,
  deposit_pending: 0,
  deposit_paid: 1,
  purchase_authorized: 1,
  purchased: 1,
  docs_pending: 1,
  shipping_booked: 2,
  in_transit: 3,
  arrived_cameroon: 4,
  ready_for_clearing: 5,
  clearing_in_progress: 5,
  completed: 6,
  cancelled: 0,
  refund_pending: 1,
  refunded: 1,
  disputed: 1,
};

export default async function ImportOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') {
    redirect('/login');
  }

  const { data: orderData } = await supabaseAdmin
    .from('import_orders')
    .select('*')
    .eq('id', params.id)
    .eq('buyer_id', user.id)
    .single();

  if (!orderData) {
    notFound();
  }

  const order = orderData as ImportOrder;

  const [{ data: quoteData }, { data: requestData }, { data: paymentData }, { data: profileData }, { data: shipmentData }, { data: documentData }] = await Promise.all([
    supabaseAdmin.from('import_quotes').select('*').eq('id', order.accepted_quote_id).single(),
    supabaseAdmin.from('import_requests').select('*').eq('id', order.request_id).single(),
    supabaseAdmin.from('import_payments').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('profiles').select('phone').eq('id', user.id).single(),
    supabaseAdmin.from('import_shipments').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('import_documents').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
  ]);

  const quote = quoteData as ImportQuote | null;
  const importRequest = requestData as ImportRequest | null;
  const payments = (paymentData ?? []) as ImportPayment[];
  const profile = profileData as Pick<Profile, 'phone'> | null;
  const shipments = (shipmentData ?? []) as ImportShipment[];
  const documents = (documentData ?? []) as ImportDocument[];
  const currentStepIdx = ORDER_PROGRESS_INDEX[order.status] ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/me/import-orders" className="text-sm font-medium text-blue-600 hover:underline">
          Back to import orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Import order</h1>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {importRequest ? `${importRequest.make} ${importRequest.model ?? ''}` : order.partner_name} · created on{' '}
          {new Date(order.created_at).toLocaleDateString('fr-FR')}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Order progress</h2>
            <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-2">
              {ORDER_STEPS.map((step, idx) => {
                const done = idx < currentStepIdx;
                const current = idx === currentStepIdx;
                return (
                  <div key={step} className="flex items-center gap-2 flex-shrink-0">
                    {idx > 0 && <div className={`h-0.5 w-8 ${done || current ? 'bg-blue-500' : 'bg-gray-200'}`} />}
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      done ? 'bg-blue-500 text-white' :
                      current ? 'bg-blue-600 text-white ring-2 ring-blue-200' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? '✓' : idx + 1}
                    </div>
                    <span className={`text-xs whitespace-nowrap ${current ? 'font-semibold text-blue-700' : 'text-gray-500'}`}>
                      {step.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>
            <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Partner</p>
                <p className="mt-1 font-medium text-gray-900">{order.partner_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Clearing mode</p>
                <p className="mt-1 font-medium text-gray-900">{order.clearing_mode.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Destination port</p>
                <p className="mt-1 font-medium text-gray-900">{order.destination_port || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Destination city</p>
                <p className="mt-1 font-medium text-gray-900">{order.destination_city || 'Not set'}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Deposit due</p>
                <p className="mt-1 font-medium text-gray-900">{formatXAF(order.reservation_deposit_amount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Balance estimate</p>
                <p className="mt-1 font-medium text-gray-900">{formatXAF(order.purchase_amount_due)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">FX snapshot</p>
                <p className="mt-1 font-medium text-gray-900">{order.fx_rate_locked ?? 'Not locked'}</p>
              </div>
            </div>
          </div>

          {quote && (
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Accepted quote</h2>
              <div className="mt-5 space-y-3 text-sm text-gray-600">
                {[
                  ['Vehicle price', quote.vehicle_price],
                  ['Auction fee', quote.auction_fee],
                  ['Inland transport', quote.inland_transport_fee],
                  ['Shipping', quote.shipping_fee],
                  ['Insurance', quote.insurance_fee],
                  ['Documentation', quote.documentation_fee],
                  ['MotoPayee fee', quote.motopayee_fee],
                  ['Estimated customs', quote.estimated_customs_fee],
                  ['Estimated port fee', quote.estimated_port_fee],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span>{label}</span>
                    <span className="font-medium text-gray-900">{formatXAF(value as number)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
                  <span>Total estimated</span>
                  <span>{formatXAF(quote.total_estimated_xaf)}</span>
                </div>
              </div>

              {quote.quote_terms && (
                <p className="mt-5 text-sm leading-7 text-gray-600">{quote.quote_terms}</p>
              )}
            </div>
          )}

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Shipment timeline</h2>
              <span className="text-xs font-medium text-gray-400">{shipments.length} shipments</span>
            </div>
            {shipments.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">MotoPayee has not added a shipment record yet.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {shipments.map((shipment) => (
                  <div key={shipment.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{shipment.carrier_name}</p>
                        <p className="text-xs text-gray-500">
                          {shipment.port_of_loading || 'Loading port TBD'} → {shipment.port_of_discharge || 'Discharge port TBD'}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {shipment.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-xs text-gray-500 md:grid-cols-4">
                      <p>Booking: {shipment.booking_ref || '-'}</p>
                      <p>BL: {shipment.bill_of_lading_no || '-'}</p>
                      <p>ETD: {shipment.etd ? new Date(shipment.etd).toLocaleDateString('fr-FR') : '-'}</p>
                      <p>ETA: {shipment.eta ? new Date(shipment.eta).toLocaleDateString('fr-FR') : '-'}</p>
                    </div>
                    {shipment.notes && <p className="mt-4 text-sm leading-6 text-gray-600">{shipment.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
              <span className="text-xs font-medium text-gray-400">{documents.length} files</span>
            </div>
            {documents.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No import documents available yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {documents.map((document) => (
                  <div key={document.id} className="flex flex-col gap-2 rounded-2xl border border-gray-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{document.filename}</p>
                      <p className="text-xs text-gray-500">
                        {document.doc_type.replace(/_/g, ' ')} · {document.verified ? 'verified' : 'pending verification'}
                      </p>
                    </div>
                    <Link
                      href={`/api/import-documents/${document.id}/signed-url`}
                      className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                      Open document
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Deposit payment</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Pay the reservation deposit to lock the order. This uses the MotoPayee mobile money flow separately from financing payments.
            </p>
            <div className="mt-5">
              <ImportPaymentRequestForm
                orderId={order.id}
                orderStatus={order.status}
                depositAmount={Math.round(Number(order.reservation_deposit_amount ?? 0))}
                buyerPhone={profile?.phone}
                existingPayments={payments}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
