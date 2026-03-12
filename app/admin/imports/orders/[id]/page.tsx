import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { ImportDocument, ImportOrder, ImportPayment, ImportQuote, ImportRequest, ImportShipment } from '@/lib/types';
import OrderStatusForm from '../OrderStatusForm';
import ShipmentCreateForm from '../ShipmentCreateForm';
import ShipmentUpdateForm from '../ShipmentUpdateForm';
import ImportDocumentUploadForm from '../ImportDocumentUploadForm';

function formatXAF(value: number | string | null) {
  if (value == null) return '-';
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

type OrderWithBuyer = ImportOrder & {
  buyer?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
  };
};

export default async function AdminImportOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: orderData } = await supabaseAdmin
    .from('import_orders')
    .select('*, buyer:profiles!buyer_id(full_name, email, phone, city)')
    .eq('id', params.id)
    .single();

  if (!orderData) {
    notFound();
  }

  const order = orderData as OrderWithBuyer;

  const [{ data: requestData }, { data: quoteData }, { data: paymentData }, { data: shipmentData }, { data: documentData }] = await Promise.all([
    supabaseAdmin.from('import_requests').select('*').eq('id', order.request_id).maybeSingle(),
    supabaseAdmin.from('import_quotes').select('*').eq('id', order.accepted_quote_id).maybeSingle(),
    supabaseAdmin.from('import_payments').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('import_shipments').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('import_documents').select('*').eq('order_id', order.id).order('created_at', { ascending: false }),
  ]);

  const importRequest = requestData as ImportRequest | null;
  const quote = quoteData as ImportQuote | null;
  const payments = (paymentData ?? []) as ImportPayment[];
  const shipments = (shipmentData ?? []) as ImportShipment[];
  const documents = (documentData ?? []) as ImportDocument[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/imports/orders" className="text-sm font-medium text-blue-600 hover:underline">
            Back to orders
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Import order operations</h1>
          <p className="mt-1 text-sm text-gray-500">
            {importRequest ? `${importRequest.make} ${importRequest.model ?? ''}` : order.partner_name} · {order.buyer?.full_name || order.buyer?.email}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Order summary</h2>
            <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Buyer</p>
                <p className="mt-1 font-medium text-gray-900">{order.buyer?.full_name || 'Unknown buyer'}</p>
                <p className="text-gray-500">{order.buyer?.email}</p>
                {order.buyer?.phone && <p className="text-gray-500">{order.buyer.phone}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Partner</p>
                <p className="mt-1 font-medium text-gray-900">{order.partner_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Deposit</p>
                <p className="mt-1 font-medium text-gray-900">{formatXAF(order.reservation_deposit_amount)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Balance estimate</p>
                <p className="mt-1 font-medium text-gray-900">{formatXAF(order.purchase_amount_due)}</p>
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
          </div>

          {quote && (
            <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Accepted quote</h2>
              <div className="mt-5 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                <p>Partner: <span className="font-medium text-gray-900">{quote.partner_name}</span></p>
                <p>Total est.: <span className="font-medium text-gray-900">{formatXAF(quote.total_estimated_xaf)}</span></p>
                <p>Deposit: <span className="font-medium text-gray-900">{formatXAF(quote.reservation_deposit_amount)}</span></p>
                <p>Expires: <span className="font-medium text-gray-900">{new Date(quote.expires_at).toLocaleDateString('fr-FR')}</span></p>
              </div>
              {quote.quote_terms && <p className="mt-4 text-sm leading-7 text-gray-600">{quote.quote_terms}</p>}
            </div>
          )}

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
              <span className="text-xs font-medium text-gray-400">{payments.length} records</span>
            </div>
            {payments.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No payments yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-gray-200 p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{formatXAF(payment.amount)} · {payment.provider}</p>
                        <p className="text-xs text-gray-500">{payment.payment_type.replace(/_/g, ' ')} · {payment.phone}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Shipments</h2>
              <span className="text-xs font-medium text-gray-400">{shipments.length} shipments</span>
            </div>
            {shipments.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">No shipment records yet.</p>
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
                    <div className="mt-4 grid gap-3 text-xs text-gray-500 md:grid-cols-3">
                      <p>Booking: {shipment.booking_ref || '-'}</p>
                      <p>BL: {shipment.bill_of_lading_no || '-'}</p>
                      <p>ETA: {shipment.eta ? new Date(shipment.eta).toLocaleString('fr-FR') : '-'}</p>
                    </div>
                    {shipment.notes && <p className="mt-4 text-sm leading-6 text-gray-600">{shipment.notes}</p>}
                    <ShipmentUpdateForm shipment={shipment} />
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
              <p className="mt-5 text-sm text-gray-500">No documents uploaded yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {documents.map((document) => (
                  <div key={document.id} className="flex flex-col gap-2 rounded-2xl border border-gray-200 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{document.filename}</p>
                      <p className="text-xs text-gray-500">
                        {document.doc_type.replace(/_/g, ' ')} · {document.verified ? 'verified' : 'unverified'}
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
            <h2 className="text-lg font-semibold text-gray-900">Update order</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Override order state, destination, or cancellation details as operations progress.
            </p>
            <div className="mt-5">
              <OrderStatusForm
                orderId={order.id}
                currentStatus={order.status}
                destinationPort={order.destination_port}
                destinationCity={order.destination_city}
                cancellationReason={order.cancellation_reason}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Create shipment</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Add a shipment record and start building the import timeline.
            </p>
            <div className="mt-5">
              <ShipmentCreateForm orderId={order.id} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Upload import document</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Upload order or shipment documents to the private storage bucket and attach them to this order.
            </p>
            <div className="mt-5">
              <ImportDocumentUploadForm orderId={order.id} shipments={shipments} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
