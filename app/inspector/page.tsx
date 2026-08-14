import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { isAdminRole, isInspectorRole } from '@/lib/auth/roles';

type InspectorListingRow = {
  id: string;
  status: string;
  asking_price: number;
  city: string | null;
  zone: string;
  created_at: string;
  vehicle?: { make: string; model: string; year: number; condition_grade: string | null } | null;
  seller?: { full_name: string | null; phone: string | null } | null;
};

type InspectionRequestRow = {
  id: string;
  listing_id: string;
  status: string;
  requester_name: string;
  requester_phone: string;
  preferred_window: string | null;
  created_at: string;
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  paid: 'Payee',
  scheduled: 'Programmee',
  completed: 'Terminee',
};

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function InspectorQueuePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!isInspectorRole(user.role) && !isAdminRole(user.role)) redirect('/admin/dashboard');

  let listingQuery = supabaseAdmin
    .from('listings')
    .select(`
      id,
      status,
      asking_price,
      city,
      zone,
      created_at,
      vehicle:vehicles(make, model, year, condition_grade),
      seller:profiles!seller_id(full_name, phone)
    `)
    .in('status', ['inspection_scheduled', 'published'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (!isAdminRole(user.role)) {
    listingQuery = listingQuery.eq('inspector_id', user.id);
  }

  const { data: listingRows } = await listingQuery;
  const listings = (listingRows ?? []) as unknown as InspectorListingRow[];
  const listingIds = listings.map((listing) => listing.id);

  const { data: requestRows } = listingIds.length > 0
    ? await supabaseAdmin
      .from('inspection_requests')
      .select('id, listing_id, status, requester_name, requester_phone, preferred_window, created_at')
      .in('listing_id', listingIds)
      .in('status', ['paid', 'scheduled', 'completed'])
      .order('created_at', { ascending: false })
    : { data: [] };

  const requestsByListing = new Map<string, InspectionRequestRow[]>();
  ((requestRows ?? []) as unknown as InspectionRequestRow[]).forEach((request) => {
    const existing = requestsByListing.get(request.listing_id) ?? [];
    existing.push(request);
    requestsByListing.set(request.listing_id, existing);
  });

  const pendingCount = listings.filter((listing) => !listing.vehicle?.condition_grade).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes inspections</h1>
          <p className="mt-1 text-sm text-gray-500">Vehicules assignes et demandes payees a inspecter.</p>
        </div>
        <Link href="/admin/dashboard" className="text-sm font-medium text-[#1a3a6b] hover:text-[#3d9e3d]">
          Tableau de bord
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-[#1a3a6b]">{listings.length}</p>
          <p className="mt-1 text-sm text-gray-500">Assignations</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          <p className="mt-1 text-sm text-gray-500">A inspecter</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-3xl font-bold text-green-600">{listings.length - pendingCount}</p>
          <p className="mt-1 text-sm text-gray-500">Deja inspectees</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Vehicule</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Demande</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Vendeur</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Aucune inspection assignee
                </td>
              </tr>
            ) : (
              listings.map((listing) => {
                const vehicle = listing.vehicle;
                const requests = requestsByListing.get(listing.id) ?? [];
                const openRequest = requests.find((request) => request.status !== 'completed') ?? requests[0];
                return (
                  <tr key={listing.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicule'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatXAF(listing.asking_price)} - {listing.city ?? listing.zone}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        Statut annonce: {listing.status.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {openRequest ? (
                        <>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                            {REQUEST_STATUS_LABELS[openRequest.status] ?? openRequest.status}
                          </span>
                          <div className="mt-2 font-medium text-gray-800">{openRequest.requester_name}</div>
                          <div>{openRequest.requester_phone}</div>
                          {openRequest.preferred_window && <div className="mt-1">Prefere: {openRequest.preferred_window}</div>}
                        </>
                      ) : (
                        <span>Aucune demande liee</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      <div className="font-medium text-gray-800">{listing.seller?.full_name ?? 'Vendeur'}</div>
                      <div>{listing.seller?.phone ?? 'Telephone non indique'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/inspector/listings/${listing.id}`}
                        className="inline-flex rounded-lg bg-[#1a3a6b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#132b50]"
                      >
                        {vehicle?.condition_grade ? 'Voir / refaire rapport' : 'Soumettre rapport'}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
