import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';

function formatXAF(value: number | string | null) {
  if (value == null) return '-';
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

type OrderRow = {
  id: string;
  status: string;
  partner_name: string;
  reservation_deposit_amount: number | null;
  purchase_amount_due: number | null;
  created_at: string;
  buyer?: { full_name?: string | null; email?: string | null };
  request?: { make?: string | null; model?: string | null };
};

export default async function AdminImportOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  let query = supabaseAdmin
    .from('import_orders')
    .select('*, buyer:profiles!buyer_id(full_name, email), request:import_requests(make, model)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data, count } = await query;
  const orders = (data ?? []) as OrderRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import orders</h1>
          <p className="mt-1 text-sm text-gray-500">Operational order queue for assisted imports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/imports/offers"
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Offers
          </Link>
          <Link
            href="/admin/imports/requests"
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Requests
          </Link>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            {count ?? 0} total
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'deposit_pending', 'deposit_paid', 'in_transit', 'arrived_cameroon', 'ready_for_clearing', 'completed'].map((status) => (
          <Link
            key={status || 'all'}
            href={status ? `/admin/imports/orders?status=${status}` : '/admin/imports/orders'}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              (searchParams.status ?? '') === status
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status ? status.replace(/_/g, ' ') : 'All'}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Buyer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Vehicle</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Partner</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Deposit</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                  No import orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">{order.buyer?.full_name || order.buyer?.email || 'Unknown buyer'}</p>
                    <p className="text-xs text-gray-400">{order.buyer?.email}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {order.request?.make || '-'} {order.request?.model || ''}
                  </td>
                  <td className="px-4 py-4 text-gray-600">{order.partner_name}</td>
                  <td className="px-4 py-4 text-gray-600">{formatXAF(order.reservation_deposit_amount)}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link href={`/admin/imports/orders/${order.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                      Open order
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
