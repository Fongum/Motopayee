import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  ownership_submitted: 'Docs propriété soumis',
  ownership_verified: 'Propriété vérifiée',
  media_done: 'Photos disponibles',
  inspection_scheduled: 'Inspection programmée',
  inspected: 'Inspecté',
  pricing_review: 'Révision du prix',
  published: 'Publié',
  sold: 'Vendu',
  withdrawn: 'Retiré',
};

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { status?: string; financeable?: string; page?: string };
}) {
  await requireAdminPage('listings');

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const PAGE_SIZE = 25;

  let query = supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(make, model, year), seller:profiles!seller_id(email, full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (searchParams.status === 'pending') {
    query = query.in('status', ['ownership_submitted', 'ownership_verified', 'media_done', 'inspected', 'pricing_review']);
  } else if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }
  if (searchParams.financeable === 'true') {
    query = query.eq('financeable', true);
  } else if (searchParams.financeable === 'false') {
    query = query.eq('financeable', false);
  }

  const { data, count } = await query;
  const listings = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Annonces</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{count ?? 0} total</span>
          <Link href="/admin/listings/new" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
            Nouvelle annonce
          </Link>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'pending', 'published', 'ownership_submitted', 'inspected'].map((s) => (
          <Link
            key={s}
            href={s ? `/admin/listings?status=${s}` : '/admin/listings'}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              searchParams.status === s || (!searchParams.status && !s)
                ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'Tous' : s === 'pending' ? 'En attente' : STATUS_LABELS[s] ?? s}
          </Link>
        ))}
        <Link
          href="/admin/listings?financeable=true"
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            searchParams.financeable === 'true'
              ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Finance eligible
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Véhicule</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Vendeur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Prix</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Zone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucune annonce trouvée</td></tr>
            ) : listings.map((l: Record<string, unknown>) => {
              const v = l.vehicle as { make: string; model: string; year: number } | undefined;
              const seller = l.seller as { email: string; full_name?: string } | undefined;
              return (
                <tr key={l.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {v ? `${v.year} ${v.make} ${v.model}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{seller?.full_name ?? seller?.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{formatXAF(Number(l.asking_price ?? 0))}</p>
                    {l.financeable ? (
                      <p className="mt-1 text-xs font-medium text-green-700">Finance eligible</p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">Non finance</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{l.zone as string}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {STATUS_LABELS[l.status as string] ?? l.status as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(l.created_at as string).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/listings/${l.id}`} className="text-[#1a3a6b] hover:text-[#3d9e3d] text-xs">
                      Voir →
                    </Link>
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
