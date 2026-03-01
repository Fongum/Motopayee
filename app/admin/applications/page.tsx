import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  docs_pending: 'Docs requis',
  docs_received: 'Docs reçus',
  under_review: 'En examen',
  approved: 'Approuvé',
  rejected: 'Refusé',
  disbursed: 'Financé',
  withdrawn: 'Annulé',
};

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const PAGE_SIZE = 25;

  let query = supabaseAdmin
    .from('financing_applications')
    .select(`
      *,
      listing:listings(id, asking_price, zone, vehicle:vehicles(make, model, year)),
      buyer:profiles!buyer_id(id, email, full_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (searchParams.status === 'active') {
    query = query.in('status', ['submitted', 'docs_pending', 'docs_received', 'under_review']);
  } else if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  const { data, count } = await query;
  const apps = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes de financement</h1>
        <span className="text-sm text-gray-500">{count ?? 0} total</span>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'active', 'submitted', 'under_review', 'approved', 'rejected'].map((s) => (
          <Link
            key={s}
            href={s ? `/admin/applications?status=${s}` : '/admin/applications'}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              searchParams.status === s || (!searchParams.status && !s)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'Tous' : s === 'active' ? 'En cours' : STATUS_LABELS[s] ?? s}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Acheteur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Véhicule</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apps.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucune demande</td></tr>
            ) : apps.map((app: Record<string, unknown>) => {
              const buyer = app.buyer as { email: string; full_name?: string } | undefined;
              const listing = app.listing as { asking_price: number; zone: string; vehicle?: { make: string; model: string; year: number } } | undefined;
              const v = listing?.vehicle;
              return (
                <tr key={app.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{buyer?.full_name ?? buyer?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v ? `${v.year} ${v.make} ${v.model}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {STATUS_LABELS[app.status as string] ?? app.status as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(app.created_at as string).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/applications/${app.id}`} className="text-blue-600 hover:underline text-xs">Voir →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
