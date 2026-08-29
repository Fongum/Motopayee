import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';
import type { HireBooking } from '@/lib/types';
import BookingAdminActions from './BookingAdminActions';
import { calculateHireServiceFee } from '@/lib/hire-service-fees';

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const STATUS_FR: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirme', cls: 'bg-blue-100 text-blue-700' },
  active: { label: 'En cours', cls: 'bg-green-100 text-green-700' },
  completed: { label: 'Termine', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Annule', cls: 'bg-red-100 text-red-600' },
  disputed: { label: 'Litige', cls: 'bg-red-100 text-red-700' },
};

const PAYMENT_FR: Record<string, { label: string; cls: string }> = {
  unpaid: { label: 'Non paye', cls: 'bg-gray-100 text-gray-600' },
  deposit_paid: { label: 'Caution payee', cls: 'bg-blue-50 text-blue-700' },
  fully_paid: { label: 'Paye', cls: 'bg-green-50 text-green-700' },
  refunded: { label: 'Rembourse', cls: 'bg-gray-100 text-gray-600' },
};

const FEE_FR: Record<string, { label: string; cls: string }> = {
  expected: { label: 'A facturer', cls: 'bg-amber-50 text-amber-700' },
  invoiced: { label: 'Facturee', cls: 'bg-blue-50 text-blue-700' },
  paid: { label: 'Encaissee', cls: 'bg-green-50 text-green-700' },
  waived: { label: 'Annulee', cls: 'bg-gray-100 text-gray-600' },
  refunded: { label: 'Remboursee', cls: 'bg-red-50 text-red-700' },
};

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmees' },
  { value: 'active', label: 'En cours' },
  { value: 'completed', label: 'Terminees' },
  { value: 'cancelled', label: 'Annulees' },
  { value: 'disputed', label: 'Litiges' },
];

type BookingRow = HireBooking & {
  hire_listing?: { id: string; make: string; model: string; year: number; city: string; plate_number?: string | null } | null;
  renter?: { full_name: string | null; email: string | null; phone: string | null } | null;
  owner?: { full_name: string | null; email: string | null; phone: string | null } | null;
};

export default async function AdminHireBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string; fee?: string };
}) {
  await requireAdminPage('hire');

  const feeFilter = ['expected', 'invoiced', 'paid', 'waived', 'refunded'].includes(searchParams.fee ?? '')
    ? searchParams.fee
    : null;
  let feeFilteredBookingIds: string[] | null = null;

  if (feeFilter) {
    const { data: filteredFees } = await supabaseAdmin
      .from('hire_service_fees')
      .select('hire_booking_id')
      .eq('status', feeFilter);

    feeFilteredBookingIds = Array.from(new Set((filteredFees ?? []).map((fee) => fee.hire_booking_id as string)));
  }

  let query = supabaseAdmin
    .from('hire_bookings')
    .select(`
      *,
      hire_listing:hire_listings(id, make, model, year, city, plate_number),
      renter:profiles!renter_id(full_name, email, phone),
      owner:profiles!owner_id(full_name, email, phone)
    `)
    .order('created_at', { ascending: false });

  if (searchParams.status && STATUS_FR[searchParams.status]) {
    query = query.eq('status', searchParams.status);
  }

  if (feeFilter) {
    query = feeFilteredBookingIds && feeFilteredBookingIds.length > 0
      ? query.in('id', feeFilteredBookingIds)
      : query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { data } = await query;
  const bookings = (data ?? []) as unknown as BookingRow[];
  const bookingIds = bookings.map((booking) => booking.id);
  const { data: feeData } = bookingIds.length > 0
    ? await supabaseAdmin
        .from('hire_service_fees')
        .select('id, hire_booking_id, fee_rate_percent, fee_amount_xaf, status, paid_at')
        .in('hire_booking_id', bookingIds)
    : { data: [] };
  const { data: allFeeData } = await supabaseAdmin
    .from('hire_service_fees')
    .select('status, fee_amount_xaf');

  const feesByBooking = new Map(
    ((feeData ?? []) as unknown as Array<{
      id: string;
      hire_booking_id: string;
      fee_rate_percent: number;
      fee_amount_xaf: number;
      status: string;
      paid_at: string | null;
    }>).map((fee) => [fee.hire_booking_id, fee])
  );
  const feeRows = (allFeeData ?? []) as Array<{ status: string; fee_amount_xaf: number | string | null }>;
  const feeAmountByStatus = (status: string) => feeRows
    .filter((fee) => fee.status === status)
    .reduce((sum, fee) => sum + Number(fee.fee_amount_xaf ?? 0), 0);
  const feeCountByStatus = (status: string) => feeRows.filter((fee) => fee.status === status).length;

  const activeValue = bookings
    .filter((booking) => ['pending', 'confirmed', 'active'].includes(booking.status))
    .reduce((total, booking) => total + Number(booking.total_amount ?? 0), 0);
  const paidValue = bookings
    .filter((booking) => booking.payment_status === 'fully_paid')
    .reduce((total, booking) => total + Number(booking.total_amount ?? 0), 0);
  const expectedFees = feeAmountByStatus('expected');
  const invoicedFees = feeAmountByStatus('invoiced');
  const collectedFees = feeAmountByStatus('paid');

  const stats = [
    { label: 'Demandes', value: bookings.filter((booking) => booking.status === 'pending').length, color: 'text-amber-600' },
    { label: 'Actives', value: bookings.filter((booking) => ['confirmed', 'active'].includes(booking.status)).length, color: 'text-blue-700' },
    { label: 'Valeur active', value: formatXAF(activeValue), color: 'text-gray-900' },
    { label: 'Payees', value: formatXAF(paidValue), color: 'text-green-700' },
    { label: 'Frais a facturer', value: `${feeCountByStatus('expected')} - ${formatXAF(expectedFees)}`, color: 'text-amber-700' },
    { label: 'Frais factures', value: `${feeCountByStatus('invoiced')} - ${formatXAF(invoicedFees)}`, color: 'text-blue-700' },
    { label: 'Frais encaisses', value: `${feeCountByStatus('paid')} - ${formatXAF(collectedFees)}`, color: 'text-green-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations location</h1>
          <p className="mt-1 text-sm text-gray-500">Suivi staff des demandes, paiements, departs, retours et litiges.</p>
        </div>
        <Link href="/admin/hire" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annonces location
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/hire/bookings?status=${filter.value}` : '/admin/hire/bookings'}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              (searchParams.status ?? '') === filter.value
                ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: '', label: 'Tous frais' },
          { value: 'expected', label: 'A facturer' },
          { value: 'invoiced', label: 'Factures' },
          { value: 'paid', label: 'Encaisses' },
          { value: 'waived', label: 'Annules' },
          { value: 'refunded', label: 'Rembourses' },
        ].map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/hire/bookings?fee=${filter.value}` : '/admin/hire/bookings'}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              (searchParams.fee ?? '') === filter.value
                ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
            Aucune reservation a afficher.
          </div>
        ) : bookings.map((booking) => {
          const status = STATUS_FR[booking.status] ?? STATUS_FR.pending;
          const payment = PAYMENT_FR[booking.payment_status] ?? PAYMENT_FR.unpaid;
          const listing = booking.hire_listing;
          const fee = feesByBooking.get(booking.id);
          const serviceFeeAmount = Number(fee?.fee_amount_xaf ?? calculateHireServiceFee(Number(booking.total_amount ?? 0)));
          const feeStatus = fee?.status ?? 'expected';
          const feeDisplay = FEE_FR[feeStatus] ?? FEE_FR.expected;

          return (
            <div key={booking.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={listing ? `/hire/${listing.id}` : '#'} className="font-bold text-[#1a3a6b] hover:text-[#3d9e3d]">
                    {listing ? `${listing.year} ${listing.make} ${listing.model}` : 'Vehicule'}
                  </Link>
                  <p className="mt-1 text-xs text-gray-400">
                    {listing?.city ?? '-'}{listing?.plate_number ? ` - ${listing.plate_number}` : ''} - {booking.start_date} au {booking.end_date} ({booking.total_days} jours)
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Locataire: {booking.renter?.full_name ?? booking.renter?.email ?? '-'}
                    {booking.renter?.phone ? ` (${booking.renter.phone})` : ''}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Proprietaire: {booking.owner?.full_name ?? booking.owner?.email ?? '-'}
                    {booking.owner?.phone ? ` (${booking.owner.phone})` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatXAF(Number(booking.total_amount ?? 0))}</p>
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.cls}`}>{status.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${payment.cls}`}>{payment.label}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-900">{formatXAF(serviceFeeAmount)}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${feeDisplay.cls}`}>
                      {feeDisplay.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 text-xs text-gray-500 md:grid-cols-3">
                <p>Type: {booking.hire_type === 'with_driver' ? 'Avec chauffeur' : 'Sans chauffeur'}</p>
                <p>Depart: {booking.pickup_location ?? '-'}</p>
                <p>Retour: {booking.dropoff_location ?? '-'}</p>
              </div>

              {booking.renter_notes && (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">Note locataire: {booking.renter_notes}</p>
              )}
              {booking.owner_notes && (
                <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">Note proprietaire: {booking.owner_notes}</p>
              )}

              {fee && (
                <form action={`/api/admin/hire/service-fees/${fee.id}/status`} method="POST" className="mt-3 flex flex-wrap gap-2">
                  <select name="status" defaultValue={fee.status} className="rounded-md border border-gray-300 px-2 py-1 text-xs">
                    <option value="expected">A facturer</option>
                    <option value="invoiced">Facturee</option>
                    <option value="paid">Encaissee</option>
                    <option value="waived">Annulee</option>
                    <option value="refunded">Remboursee</option>
                  </select>
                  <button type="submit" className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700">
                    Reconciler frais
                  </button>
                </form>
              )}

              <BookingAdminActions
                bookingId={booking.id}
                status={booking.status}
                paymentStatus={booking.payment_status}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
