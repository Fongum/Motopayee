import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

function formatXAF(n: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function MFIRootPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'mfi_partner' && user.role !== 'admin') redirect('/');

  let institutionId: string | null = null;
  let institutionName = 'Portail IMF';

  if (user.role === 'mfi_partner') {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('mfi_institution_id')
      .eq('id', user.id)
      .single();

    institutionId = (profile as { mfi_institution_id: string | null } | null)?.mfi_institution_id ?? null;

    if (!institutionId) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-500">
            Votre compte n&apos;est pas lie a une IMF. Contactez l&apos;administrateur.
          </p>
        </div>
      );
    }

    const { data: inst } = await supabaseAdmin
      .from('mfi_institutions')
      .select('name')
      .eq('id', institutionId)
      .single();
    institutionName = (inst as { name: string } | null)?.name ?? institutionName;
  }

  const openStatuses = ['submitted', 'docs_received', 'under_review', 'approved'];

  const [
    { data: openApplicationRows },
    { data: offerRows },
    { data: interestedRows },
  ] = await Promise.all([
    supabaseAdmin
      .from('financing_applications')
      .select('id, listing:listings!inner(financeable)')
      .in('status', openStatuses)
      .eq('listing.financeable', true),
    institutionId
      ? supabaseAdmin
        .from('mfi_application_offers')
        .select('id, status, buyer_response, application:financing_applications(status)')
        .eq('mfi_institution_id', institutionId)
      : supabaseAdmin
        .from('mfi_application_offers')
        .select('id, status, buyer_response, application:financing_applications(status)'),
    institutionId
      ? supabaseAdmin
        .from('mfi_application_offers')
        .select(`
          id,
          buyer_responded_at,
          application:financing_applications(
            id,
            status,
            listing:listings(asking_price, zone, vehicle:vehicles(make, model, year)),
            buyer:profiles!buyer_id(full_name, city)
          )
        `)
        .eq('mfi_institution_id', institutionId)
        .eq('buyer_response', 'interested')
        .order('buyer_responded_at', { ascending: false })
        .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  const offers = (offerRows ?? []) as unknown as Array<{
    id: string;
    status: string;
    buyer_response: string | null;
    application?: { status: string } | Array<{ status: string }> | null;
  }>;
  const openApplications = (openApplicationRows ?? []).length;
  const submittedOffers = offers.filter((offer) => ['submitted', 'shortlisted', 'accepted'].includes(offer.status)).length;
  const interestedOffers = offers.filter((offer) => offer.buyer_response === 'interested').length;
  const acceptedOffers = offers.filter((offer) => offer.status === 'accepted').length;
  const readyToDisburseOffers = offers.filter((offer) => {
    const application = Array.isArray(offer.application) ? offer.application[0] : offer.application;
    return offer.status === 'accepted' && application?.status === 'approved';
  }).length;
  const disbursedOffers = offers.filter((offer) => {
    const application = Array.isArray(offer.application) ? offer.application[0] : offer.application;
    return offer.status === 'accepted' && application?.status === 'disbursed';
  }).length;

  const interestedItems = (interestedRows ?? []) as unknown as Array<{
    id: string;
    buyer_responded_at: string | null;
    application?: {
      id: string;
      status: string;
      listing?: {
        asking_price: number;
        zone: string;
        vehicle?: { make: string; model: string; year: number };
      } | Array<{
        asking_price: number;
        zone: string;
        vehicle?: { make: string; model: string; year: number } | Array<{ make: string; model: string; year: number }>;
      }> | null;
      buyer?: { full_name?: string | null; city?: string | null } | Array<{ full_name?: string | null; city?: string | null }> | null;
    } | Array<{
      id: string;
      status: string;
      listing?: {
        asking_price: number;
        zone: string;
        vehicle?: { make: string; model: string; year: number } | Array<{ make: string; model: string; year: number }>;
      } | Array<{
        asking_price: number;
        zone: string;
        vehicle?: { make: string; model: string; year: number } | Array<{ make: string; model: string; year: number }>;
      }> | null;
      buyer?: { full_name?: string | null; city?: string | null } | Array<{ full_name?: string | null; city?: string | null }> | null;
    }> | null;
  }>;

  const stats = [
    { label: 'Dossiers ouverts', value: openApplications, href: '/mfi/applications', color: 'text-blue-600' },
    { label: 'Vos offres actives', value: submittedOffers, href: '/mfi/applications?filter=my_offers', color: 'text-[#1a3a6b]' },
    { label: 'Acheteurs interesses', value: interestedOffers, href: '/mfi/applications?filter=buyer_interested', color: 'text-green-600' },
    { label: 'Offres retenues', value: acceptedOffers, href: '/mfi/applications?filter=accepted', color: 'text-emerald-700' },
    { label: 'A decaisser', value: readyToDisburseOffers, href: '/mfi/applications?filter=ready_to_disburse', color: 'text-amber-600' },
    { label: 'Financees', value: disbursedOffers, href: '/mfi/applications?filter=disbursed', color: 'text-green-800' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{institutionName}</h1>
        <p className="mt-1 text-sm text-gray-500">Suivi des dossiers financeables et des reponses acheteurs.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#3d9e3d] hover:shadow-sm"
          >
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-gray-900">Acheteurs interesses</h2>
            <Link href="/mfi/applications?filter=buyer_interested" className="text-sm font-medium text-[#1a3a6b] hover:text-[#3d9e3d]">
              Voir tout
            </Link>
          </div>
          {interestedItems.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune reponse acheteur pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {interestedItems.map((offer) => {
                const application = Array.isArray(offer.application) ? offer.application[0] : offer.application;
                const listing = Array.isArray(application?.listing) ? application?.listing[0] : application?.listing;
                const buyer = Array.isArray(application?.buyer) ? application?.buyer[0] : application?.buyer;
                const vehicle = Array.isArray(listing?.vehicle) ? listing?.vehicle[0] : listing?.vehicle;
                return (
                  <Link
                    key={offer.id}
                    href={application ? `/mfi/applications/${application.id}` : '/mfi/applications'}
                    className="block rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-green-200 hover:bg-green-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicule'}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {buyer?.full_name ?? 'Acheteur'} - {buyer?.city ?? 'Ville non definie'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {listing ? `${listing.zone} - ${formatXAF(listing.asking_price)}` : 'Details non disponibles'}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        Interesse
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Actions rapides</h2>
          <div className="mt-4 space-y-3">
            <Link href="/mfi/applications?filter=buyer_interested" className="flex items-center justify-between border-b border-gray-100 py-2 text-sm hover:text-[#3d9e3d]">
              <span>Traiter les acheteurs interesses</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/mfi/applications" className="flex items-center justify-between border-b border-gray-100 py-2 text-sm hover:text-[#3d9e3d]">
              <span>Voir les dossiers financeables</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/mfi/applications?filter=ready_to_disburse" className="flex items-center justify-between border-b border-gray-100 py-2 text-sm hover:text-[#3d9e3d]">
              <span>Traiter les dossiers a decaisser</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
            <Link href="/mfi/applications" className="flex items-center justify-between py-2 text-sm hover:text-[#3d9e3d]">
              <span>Mettre a jour vos offres</span>
              <span className="text-gray-400">-&gt;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
