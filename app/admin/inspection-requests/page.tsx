import Link from 'next/link';
import { supabaseAdmin } from '@/lib/auth/server';
import type { InspectionRequest, InspectionRequestStatus } from '@/lib/types';
import InspectionRequestActions from './InspectionRequestActions';

const STATUS_LABELS: Record<InspectionRequestStatus, string> = {
  submitted: 'Nouveau',
  contacted: 'Contacte',
  quoted: 'Devis envoye',
  paid: 'Paye',
  scheduled: 'Programme',
  completed: 'Termine',
  cancelled: 'Annule',
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tous' },
  { value: 'active', label: 'Actifs' },
  { value: 'submitted', label: 'Nouveaux' },
  { value: 'paid', label: 'Payes' },
  { value: 'scheduled', label: 'Programmes' },
  { value: 'completed', label: 'Termines' },
];

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Paiement envoye',
  processing: 'Paiement en traitement',
  successful: 'Paiement recu',
  failed: 'Paiement echoue',
  cancelled: 'Paiement annule',
};

const PROVIDER_LABELS: Record<string, string> = {
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
};

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}

type RequestRow = InspectionRequest & {
  listing?: {
    id: string;
    asking_price: number;
    status: string;
    inspector_id: string | null;
    city: string | null;
    zone: string;
    seller?: { full_name: string | null; phone: string | null } | null;
    inspector?: { full_name: string | null; email: string | null } | null;
    vehicle?: { make: string; model: string; year: number; condition_grade: string | null } | null;
  } | null;
  requester?: { full_name: string | null; email: string | null } | null;
};

type PaymentSummary = {
  id: string;
  inspection_request_id: string;
  amount: number;
  provider: string;
  status: string;
  created_at: string;
};

export default async function AdminInspectionRequestsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  let query = supabaseAdmin
    .from('inspection_requests')
    .select(`
      *,
      requester:profiles!requester_id(full_name, email),
      listing:listings(
        id,
        asking_price,
        status,
        inspector_id,
        city,
        zone,
        seller:profiles!seller_id(full_name, phone),
        inspector:profiles!inspector_id(full_name, email),
        vehicle:vehicles(make, model, year, condition_grade)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (searchParams.status === 'active') {
    query = query.in('status', ['submitted', 'contacted', 'quoted', 'paid', 'scheduled']);
  } else if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data } = await query;
  const requests = (data ?? []) as unknown as RequestRow[];
  const requestIds = requests.map((request) => request.id);
  const { data: paymentRows } = requestIds.length > 0
    ? await supabaseAdmin
      .from('payments')
      .select('id, inspection_request_id, amount, provider, status, created_at')
      .in('inspection_request_id', requestIds)
      .eq('payment_type', 'inspection_fee')
      .order('created_at', { ascending: false })
    : { data: [] };
  const latestPayments = new Map<string, PaymentSummary>();
  ((paymentRows ?? []) as unknown as PaymentSummary[]).forEach((payment) => {
    if (!latestPayments.has(payment.inspection_request_id)) {
      latestPayments.set(payment.inspection_request_id, payment);
    }
  });
  const { data: inspectorRows } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'inspector')
    .eq('status', 'active')
    .order('full_name');
  const inspectors = (inspectorRows ?? []).map((inspector) => ({
    id: inspector.id as string,
    label: ((inspector.full_name as string | null) || (inspector.email as string | null) || 'Inspecteur') as string,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes d&apos;inspection</h1>
          <p className="mt-1 text-sm text-gray-500">Leads acheteurs a convertir en inspections payees.</p>
        </div>
        <span className="text-sm text-gray-500">{requests.length} affichees</span>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value || 'all'}
            href={filter.value ? `/admin/inspection-requests?status=${filter.value}` : '/admin/inspection-requests'}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              searchParams.status === filter.value || (!searchParams.status && !filter.value)
                ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Vehicule</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Acheteur</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Vendeur</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Statut</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Suivi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucune demande trouvee
                </td>
              </tr>
            ) : (
              requests.map((request) => {
                const vehicle = request.listing?.vehicle;
                const seller = request.listing?.seller;
                const payment = latestPayments.get(request.id);
                return (
                  <tr key={request.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Annonce'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {request.listing ? `${formatXAF(request.listing.asking_price)} - ${request.listing.city ?? request.listing.zone}` : 'Annonce indisponible'}
                      </div>
                      {request.listing && (
                        <Link
                          href={`/admin/listings/${request.listing.id}`}
                          className="mt-2 inline-block text-xs font-medium text-[#1a3a6b] hover:text-[#3d9e3d]"
                        >
                          Ouvrir annonce
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{request.requester_name}</div>
                      <div className="text-xs text-gray-500">{request.requester_phone}</div>
                      {request.requester_email && <div className="text-xs text-gray-500">{request.requester_email}</div>}
                      {request.preferred_window && (
                        <div className="mt-2 text-xs text-gray-500">Prefere: {request.preferred_window}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      <div className="font-medium text-gray-800">{seller?.full_name ?? 'Vendeur'}</div>
                      <div>{seller?.phone ?? 'Telephone non indique'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {STATUS_LABELS[request.status] ?? request.status}
                      </span>
                      <div className="mt-2 text-xs text-gray-500">{formatXAF(Number(request.fee_xaf))}</div>
                      {payment && (
                        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
                          <div className="font-medium text-gray-800">
                            {PAYMENT_LABELS[payment.status] ?? payment.status}
                          </div>
                          <div>
                            {PROVIDER_LABELS[payment.provider] ?? payment.provider} - {formatXAF(payment.amount)}
                          </div>
                        </div>
                      )}
                      {request.listing?.inspector && (
                        <div className="mt-1 text-xs text-gray-500">
                          Inspecteur: {request.listing.inspector.full_name ?? request.listing.inspector.email}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <InspectionRequestActions
                        requestId={request.id}
                        currentStatus={request.status}
                        currentInspectorId={request.listing?.inspector_id}
                        feeXaf={Number(request.fee_xaf)}
                        requesterPhone={request.requester_phone}
                        paymentStatus={payment?.status}
                        inspectors={inspectors}
                      />
                      {request.notes && <p className="mt-2 text-xs leading-relaxed text-gray-500">{request.notes}</p>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
