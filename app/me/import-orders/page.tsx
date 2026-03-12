import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { ImportOrder } from '@/lib/types';

function formatXAF(value: number | string | null) {
  if (value == null) return '-';
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default async function ImportOrdersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') {
    redirect('/login');
  }

  const { data } = await supabaseAdmin
    .from('import_orders')
    .select('*')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false });

  const orders = (data ?? []) as ImportOrder[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import orders</h1>
        <p className="mt-1 text-sm text-gray-500">Orders created after you accept a MotoPayee import quote.</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No import orders yet</p>
          <p className="mt-2 text-sm text-gray-500">Accept a quote from one of your import requests to create an order.</p>
          <Link
            href="/me/import-requests"
            className="mt-6 inline-flex rounded-xl bg-[#1a3a6b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#132b50]"
          >
            View my import requests
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{order.partner_name}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Order created on {new Date(order.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="mt-5 grid gap-4 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Deposit</p>
                  <p className="mt-1 font-medium text-gray-900">{formatXAF(order.reservation_deposit_amount)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Balance</p>
                  <p className="mt-1 font-medium text-gray-900">{formatXAF(order.purchase_amount_due)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Clearing mode</p>
                  <p className="mt-1 font-medium text-gray-900">{order.clearing_mode.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <Link
                href={`/me/import-orders/${order.id}`}
                className="mt-4 inline-flex rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                View order
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
