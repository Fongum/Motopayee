import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';

const QUEUE_FILTERS = [
  { value: 'ready', label: 'Prets IMF' },
  { value: 'candidates', label: 'Candidats' },
  { value: 'needs_review', label: 'A verifier' },
  { value: 'all', label: 'Tous' },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  ownership_submitted: 'Docs propriete soumis',
  ownership_verified: 'Propriete verifiee',
  media_done: 'Photos disponibles',
  inspection_scheduled: 'Inspection programmee',
  inspected: 'Inspecte',
  pricing_review: 'Revision du prix',
  published: 'Publie',
  sold: 'Vendu',
  withdrawn: 'Retire',
};

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

function queueHref(queue: string) {
  return queue === 'ready' ? '/admin/finance/eligible' : `/admin/finance/eligible?queue=${queue}`;
}

export default async function AdminFinanceEligiblePage({
  searchParams,
}: {
  searchParams: { queue?: string };
}) {
  await requireAdminPage('finance');

  const queue = searchParams.queue ?? 'ready';
  let query = supabaseAdmin
    .from('listings')
    .select(`
      id,
      status,
      asking_price,
      suggested_price,
      price_band,
      financeable,
      zone,
      city,
      published_at,
      updated_at,
      vehicle:vehicles(make, model, year, condition_grade, mileage_km),
      seller:profiles!seller_id(full_name, email, phone, city)
    `)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (queue === 'ready') {
    query = query.eq('status', 'published').eq('financeable', true);
  } else if (queue === 'candidates') {
    query = query.in('status', ['inspected', 'pricing_review', 'published']);
  } else if (queue === 'needs_review') {
    query = query.in('status', ['inspected', 'pricing_review', 'published']).eq('financeable', false);
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    status: string;
    asking_price: number | string;
    suggested_price: number | string | null;
    price_band: string | null;
    financeable: boolean;
    zone: string;
    city: string | null;
    published_at: string | null;
    updated_at: string;
    vehicle?: { make: string; model: string; year: number; condition_grade?: string | null; mileage_km?: number | null } | null;
    seller?: { full_name?: string | null; email?: string | null; phone?: string | null; city?: string | null } | null;
  }>;

  const listingIds = rows.map((row) => row.id);
  const [{ data: appData }, { data: inspectionData }] = listingIds.length > 0
    ? await Promise.all([
        supabaseAdmin
          .from('financing_applications')
          .select('id, listing_id, status, created_at')
          .in('listing_id', listingIds),
        supabaseAdmin
          .from('inspections')
          .select('id, listing_id, condition_grade, financeable, inspected_at, created_at')
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const applicationsByListing = new Map<string, Array<{ id: string; status: string; created_at: string }>>();
  ((appData ?? []) as Array<{ id: string; listing_id: string; status: string; created_at: string }>).forEach((app) => {
    const current = applicationsByListing.get(app.listing_id) ?? [];
    current.push({ id: app.id, status: app.status, created_at: app.created_at });
    applicationsByListing.set(app.listing_id, current);
  });

  const latestInspectionByListing = new Map<string, { condition_grade: string | null; financeable: boolean; inspected_at: string | null; created_at: string }>();
  ((inspectionData ?? []) as Array<{ listing_id: string; condition_grade: string | null; financeable: boolean; inspected_at: string | null; created_at: string }>).forEach((inspection) => {
    if (!latestInspectionByListing.has(inspection.listing_id)) {
      latestInspectionByListing.set(inspection.listing_id, inspection);
    }
  });

  const readyCount = rows.filter((row) => row.status === 'published' && row.financeable).length;
  const candidateCount = rows.filter((row) => ['inspected', 'pricing_review', 'published'].includes(row.status)).length;
  const reviewCount = rows.filter((row) => ['inspected', 'pricing_review', 'published'].includes(row.status) && !row.financeable).length;
  const totalReadyValue = rows
    .filter((row) => row.status === 'published' && row.financeable)
    .reduce((sum, row) => sum + Number(row.asking_price ?? 0), 0);

  const stats = [
    { label: 'Prets IMF', value: readyCount.toLocaleString('fr-FR'), href: '/admin/finance/eligible' },
    { label: 'Valeur prete', value: formatXAF(totalReadyValue), href: '/admin/finance/eligible' },
    { label: 'Candidats', value: candidateCount.toLocaleString('fr-FR'), href: '/admin/finance/eligible?queue=candidates' },
    { label: 'A verifier', value: reviewCount.toLocaleString('fr-FR'), href: '/admin/finance/eligible?queue=needs_review' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicules finance eligible</h1>
          <p className="mt-1 text-sm text-gray-500">File courte pour preparer les conversations IMF et relier les acheteurs aux bonnes annonces.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/finance" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Reconciliation
          </Link>
          <Link href="/admin/listings?financeable=true" className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]">
            Voir listings
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#3d9e3d] hover:shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {QUEUE_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={queueHref(filter.value)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              queue === filter.value || (!searchParams.queue && filter.value === 'ready')
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
              <th className="px-4 py-3 text-left font-medium text-gray-700">Vendeur</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Prix</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Signal finance</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Demandes</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">MAJ</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">Aucun vehicule dans cette file</td>
              </tr>
            ) : rows.map((row) => {
              const vehicle = row.vehicle;
              const seller = row.seller;
              const apps = applicationsByListing.get(row.id) ?? [];
              const activeApps = apps.filter((app) => !['rejected', 'withdrawn', 'disbursed'].includes(app.status));
              const latestInspection = latestInspectionByListing.get(row.id);
              return (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicule'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.city ?? seller?.city ?? 'Ville n/a'} - Zone {row.zone}
                      {vehicle?.mileage_km ? ` - ${vehicle.mileage_km.toLocaleString('fr-FR')} km` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{seller?.full_name ?? seller?.email ?? '-'}</p>
                    <p className="mt-1 text-xs text-gray-400">{seller?.phone ?? seller?.city ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{formatXAF(Number(row.asking_price ?? 0))}</p>
                    {row.suggested_price ? (
                      <p className="mt-1 text-xs text-gray-500">Sug.: {formatXAF(Number(row.suggested_price))}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.financeable ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {row.financeable ? 'Finance eligible' : 'Non marque'}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {STATUS_LABELS[row.status] ?? row.status}
                      </span>
                      {row.price_band ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Prix {row.price_band}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Inspection: {latestInspection?.condition_grade ?? vehicle?.condition_grade ?? 'n/a'}
                      {latestInspection ? ` - ${latestInspection.financeable ? 'OK finance' : 'a revoir'}` : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{apps.length}</p>
                    <p className="mt-1 text-xs text-gray-500">{activeApps.length} actives</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(row.updated_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/listings/${row.id}`} className="text-xs font-semibold text-[#1a3a6b] hover:text-[#3d9e3d]">
                      Ouvrir
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
