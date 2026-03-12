import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { ImportRequest } from '@/lib/types';

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

type RequestWithBuyer = ImportRequest & {
  buyer?: {
    full_name?: string | null;
    email?: string | null;
  };
};

export default async function AdminImportRequestsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const pageSize = 25;

  let query = supabaseAdmin
    .from('import_requests')
    .select('*, buyer:profiles!buyer_id(id, full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data, count } = await query;
  const requests = (data ?? []) as RequestWithBuyer[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import requests</h1>
          <p className="mt-1 text-sm text-gray-500">Buyer demand queue for assisted imports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/imports/offers"
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Offers
          </Link>
          <Link
            href="/admin/imports/orders"
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Orders
          </Link>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {count ?? 0} total
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'submitted', 'reviewing', 'quoted', 'accepted', 'cancelled'].map((status) => (
          <Link
            key={status || 'all'}
            href={status ? `/admin/imports/requests?status=${status}` : '/admin/imports/requests'}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              (searchParams.status ?? '') === status
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status ? (STATUS_LABELS[status] ?? status) : 'All'}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Buyer</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Request</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Budget</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  No import requests found.
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">{request.buyer?.full_name || request.buyer?.email || 'Unknown buyer'}</p>
                    <p className="text-xs text-gray-400">{request.buyer?.email}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    <p className="font-medium text-gray-900">
                      {request.make} {request.model ?? ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {request.year_min ?? 'Any'} - {request.year_max ?? 'Any'} · {request.source_country}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{formatXAF(request.budget_max_xaf)}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {STATUS_LABELS[request.status] ?? request.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    {new Date(request.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link href={`/admin/imports/requests/${request.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                      Review request
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
