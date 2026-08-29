import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import Link from 'next/link';

const OPEN_LEAD_STATUSES = ['new', 'contacted', 'interested', 'qualified', 'awaiting_assets', 'ready_for_listing', 'onboarding'];

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

function leadProfileId(lead: { converted_entity_type: string | null; converted_entity_id: string | null }) {
  return lead.converted_entity_type === 'profile' ? lead.converted_entity_id : null;
}

export default async function AdminFinanceMatchesPage({
  searchParams,
}: {
  searchParams: { lead_id?: string; buyer_id?: string };
}) {
  await requireAdminPage('finance');

  const [{ data: leadData }, { data: listingData }, { data: applicationData }] = await Promise.all([
    supabaseAdmin
      .from('launch_leads')
      .select('id, name, phone, email, city, interest, notes, status, priority, converted_entity_type, converted_entity_id, created_at, next_follow_up_at')
      .eq('lead_type', 'buyer')
      .in('status', OPEN_LEAD_STATUSES)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(40),
    supabaseAdmin
      .from('listings')
      .select('id, asking_price, zone, city, price_band, published_at, vehicle:vehicles(make, model, year, mileage_km, condition_grade), seller:profiles!seller_id(full_name, phone, city)')
      .eq('status', 'published')
      .eq('financeable', true)
      .order('published_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('financing_applications')
      .select('id, buyer_id, listing_id, status, created_at')
      .not('status', 'eq', 'withdrawn')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  const leads = (leadData ?? []) as Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    interest: string | null;
    notes: string | null;
    status: string;
    priority: string;
    converted_entity_type: string | null;
    converted_entity_id: string | null;
    created_at: string;
    next_follow_up_at: string | null;
  }>;

  const listings = (listingData ?? []) as unknown as Array<{
    id: string;
    asking_price: number | string;
    zone: string;
    city: string | null;
    price_band: string | null;
    published_at: string | null;
    vehicle?: { make: string; model: string; year: number; mileage_km?: number | null; condition_grade?: string | null } | null;
    seller?: { full_name?: string | null; phone?: string | null; city?: string | null } | null;
  }>;

  const applications = (applicationData ?? []) as Array<{
    id: string;
    buyer_id: string;
    listing_id: string;
    status: string;
    created_at: string;
  }>;

  const selectedLead = searchParams.lead_id ? leads.find((lead) => lead.id === searchParams.lead_id) : null;
  const selectedBuyerId = searchParams.buyer_id ?? (selectedLead ? leadProfileId(selectedLead) : null);
  const selectedApplications = selectedBuyerId ? applications.filter((app) => app.buyer_id === selectedBuyerId) : [];
  const selectedApplicationListingIds = new Set(selectedApplications.map((app) => app.listing_id));
  const cityMatchedListings = selectedLead?.city
    ? listings.filter((listing) => (listing.city ?? listing.seller?.city ?? '').toLowerCase() === selectedLead.city?.toLowerCase())
    : [];
  const recommendedListings = [
    ...cityMatchedListings,
    ...listings.filter((listing) => !cityMatchedListings.some((matched) => matched.id === listing.id)),
  ].slice(0, 8);

  const convertedLeads = leads.filter((lead) => lead.converted_entity_type === 'financing_application').length;
  const profileReadyLeads = leads.filter((lead) => leadProfileId(lead)).length;
  const dueLeads = leads.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= new Date()).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matching finance</h1>
          <p className="mt-1 text-sm text-gray-500">Associer les acheteurs leads aux vehicules finance eligible et creer les dossiers a traiter.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/finance/eligible" className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
            Vehicules eligibles
          </Link>
          <Link href="/admin/applications?status=mfi_unassigned" className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100">
            A router IMF
          </Link>
          <Link href="/admin/applications?status=follow_up_due" className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Relances dossiers
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Leads acheteurs ouverts', value: leads.length, href: '/admin/finance/matches' },
          { label: 'Profils prets', value: profileReadyLeads, href: '/admin/finance/matches' },
          { label: 'Relances dues', value: dueLeads, href: '/admin/leads?type=buyer&filter=due' },
          { label: 'Convertis dossier', value: convertedLeads, href: '/admin/applications' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#3d9e3d] hover:shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-4">
            <h2 className="font-semibold text-gray-900">Acheteurs a matcher</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {leads.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">Aucun lead acheteur ouvert.</p>
            ) : leads.map((lead) => {
              const profileId = leadProfileId(lead);
              const isSelected = lead.id === selectedLead?.id;
              return (
                <div key={lead.id} className={`p-4 ${isSelected ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{lead.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{lead.city ?? 'Ville n/a'} - {lead.phone ?? lead.email ?? 'Contact n/a'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lead.priority === 'high' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {lead.priority}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{lead.interest ?? lead.notes ?? 'Besoin non detaille'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/finance/matches?lead_id=${lead.id}${profileId ? `&buyer_id=${profileId}` : ''}`}
                      className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Matcher
                    </Link>
                    {profileId ? (
                      <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        Profil pret
                      </span>
                    ) : (
                      <form action={`/api/admin/leads/${lead.id}/profile`} method="POST">
                        <input type="hidden" name="role" value="buyer" />
                        <input type="hidden" name="next" value="finance_matches" />
                        <button type="submit" className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-gray-800">
                          Creer profil
                        </button>
                      </form>
                    )}
                    <Link href={`/admin/leads/${lead.id}`} className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      Lead
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-4">
            <h2 className="font-semibold text-gray-900">Vehicules recommandes</h2>
            {selectedLead ? (
              <p className="mt-1 text-sm text-gray-500">Selection: {selectedLead.name}{selectedLead.city ? ` - ${selectedLead.city}` : ''}</p>
            ) : (
              <p className="mt-1 text-sm text-gray-500">Selectionnez un acheteur pour creer un dossier.</p>
            )}
          </div>

          <div className="divide-y divide-gray-100">
            {recommendedListings.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">Aucun vehicule finance eligible publie.</p>
            ) : recommendedListings.map((listing) => {
              const vehicle = listing.vehicle;
              const alreadyApplied = selectedApplicationListingIds.has(listing.id);
              return (
                <div key={listing.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_180px] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicule'}
                      </p>
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Finance eligible</span>
                      {listing.price_band ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Prix {listing.price_band}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#1a3a6b]">{formatXAF(Number(listing.asking_price ?? 0))}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {listing.city ?? listing.seller?.city ?? 'Ville n/a'} - Zone {listing.zone}
                      {vehicle?.condition_grade ? ` - Grade ${vehicle.condition_grade}` : ''}
                      {vehicle?.mileage_km ? ` - ${vehicle.mileage_km.toLocaleString('fr-FR')} km` : ''}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Vendeur: {listing.seller?.full_name ?? listing.seller?.phone ?? '-'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link href={`/admin/listings/${listing.id}`} className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      Voir
                    </Link>
                    {selectedLead && selectedBuyerId ? (
                      alreadyApplied ? (
                        <span className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-600">Dossier existe</span>
                      ) : (
                        <form action="/api/admin/applications" method="POST">
                          <input type="hidden" name="buyer_id" value={selectedBuyerId} />
                          <input type="hidden" name="listing_id" value={listing.id} />
                          <input type="hidden" name="launch_lead_id" value={selectedLead.id} />
                          <input type="hidden" name="notes" value={`Created from buyer lead ${selectedLead.id}.`} />
                          <button type="submit" className="rounded-md bg-[#3d9e3d] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2d8a2d]">
                            Creer dossier
                          </button>
                        </form>
                      )
                    ) : (
                      <span className="rounded-md bg-gray-100 px-2.5 py-1.5 text-xs text-gray-500">Profil requis</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
