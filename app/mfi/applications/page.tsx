import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { FinancingApplication } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Soumis', docs_pending: 'Docs requis',
  docs_received: 'Docs reçus', under_review: 'En examen',
  approved: 'Approuvé', rejected: 'Refusé', disbursed: 'Financé', withdrawn: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-700',
  docs_pending: 'bg-orange-100 text-orange-700',
  docs_received: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  disbursed: 'bg-green-200 text-green-800',
  withdrawn: 'bg-gray-100 text-gray-500',
};

function formatXAF(n: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency', currency: 'XAF', maximumFractionDigits: 0,
  }).format(n);
}

export default async function MFIApplicationsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'mfi_partner' && user.role !== 'admin') redirect('/');

  let institutionId: string | null = null;
  let institutionName: string | null = null;

  if (user.role === 'mfi_partner') {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('mfi_institution_id')
      .eq('id', user.id)
      .single();
    institutionId = (profile as { mfi_institution_id: string | null } | null)
      ?.mfi_institution_id ?? null;

    if (!institutionId) {
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-500">
            Votre compte n&apos;est pas lié à une IMF. Contactez l&apos;administrateur.
          </p>
        </div>
      );
    }

    const { data: inst } = await supabaseAdmin
      .from('mfi_institutions')
      .select('name')
      .eq('id', institutionId)
      .single();
    institutionName = (inst as { name: string } | null)?.name ?? null;
  }

  let query = supabaseAdmin
    .from('financing_applications')
    .select(`
      id, status, created_at, income_grade,
      disbursed_at, mfi_institution_id,
      listing:listings(asking_price, zone, financeable, vehicle:vehicles(make, model, year)),
      buyer:profiles!buyer_id(full_name, city)
    `)
    .order('created_at', { ascending: false });

  if (institutionId) {
    query = query
      .in('status', ['submitted', 'docs_received', 'under_review', 'approved', 'disbursed'])
      .eq('listing.financeable', true);
  } else {
    // Admin sees all applications that have an MFI assigned
    query = query.not('mfi_institution_id', 'is', null);
  }

  const { data } = await query;
  const appIds = (data ?? []).map((app: { id: string }) => app.id);
  const { data: offerRows } = institutionId && appIds.length > 0
    ? await supabaseAdmin
      .from('mfi_application_offers')
      .select('application_id, status, buyer_response, buyer_responded_at')
      .eq('mfi_institution_id', institutionId)
      .in('application_id', appIds)
    : { data: [] };
  const offersByApplication = new Map<string, { status: string; buyer_response: string | null; buyer_responded_at: string | null }>(
    ((offerRows ?? []) as Array<{
      application_id: string;
      status: string;
      buyer_response: string | null;
      buyer_responded_at: string | null;
    }>).map((offer) => [offer.application_id, {
      status: offer.status,
      buyer_response: offer.buyer_response,
      buyer_responded_at: offer.buyer_responded_at,
    }])
  );

  const allItems = (data ?? []) as unknown as Array<
    FinancingApplication & {
      mfi_institution_id?: string | null;
      listing?: {
        asking_price: number;
        zone: string;
        financeable?: boolean;
        vehicle?: { make: string; model: string; year: number };
      };
      buyer?: { full_name?: string; city?: string };
    }
  >;
  const items = searchParams.filter === 'buyer_interested'
    ? allItems.filter((app) => offersByApplication.get(app.id)?.buyer_response === 'interested')
    : searchParams.filter === 'assigned'
      ? allItems.filter((app) => app.mfi_institution_id === institutionId)
    : searchParams.filter === 'needs_response'
      ? allItems.filter((app) => app.mfi_institution_id === institutionId && !offersByApplication.has(app.id))
    : searchParams.filter === 'open_market'
      ? allItems.filter((app) => app.mfi_institution_id !== institutionId && !offersByApplication.has(app.id))
    : searchParams.filter === 'my_offers'
      ? allItems.filter((app) => {
        const offer = offersByApplication.get(app.id);
        return offer ? ['submitted', 'shortlisted', 'accepted'].includes(offer.status) : false;
      })
    : searchParams.filter === 'accepted'
      ? allItems.filter((app) => offersByApplication.get(app.id)?.status === 'accepted')
    : searchParams.filter === 'ready_to_disburse'
      ? allItems.filter((app) => offersByApplication.get(app.id)?.status === 'accepted' && app.status === 'approved')
    : searchParams.filter === 'disbursed'
      ? allItems.filter((app) => offersByApplication.get(app.id)?.status === 'accepted' && app.status === 'disbursed')
    : allItems;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes de financement</h1>
        {institutionName && (
          <p className="text-gray-500 text-sm mt-0.5">{institutionName}</p>
        )}
        <p className="text-gray-500 text-sm mt-1">
          {items.length} demande{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      {institutionId && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { value: '', label: 'Toutes' },
            { value: 'assigned', label: 'Assignees' },
            { value: 'needs_response', label: 'A repondre' },
            { value: 'open_market', label: 'Ouvertes' },
            { value: 'my_offers', label: 'Mes offres actives' },
            { value: 'buyer_interested', label: 'Acheteurs interesses' },
            { value: 'accepted', label: 'Offres retenues' },
            { value: 'ready_to_disburse', label: 'A decaisser' },
            { value: 'disbursed', label: 'Financees' },
          ].map((filter) => (
            <Link
              key={filter.value}
              href={filter.value ? `/mfi/applications?filter=${filter.value}` : '/mfi/applications'}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                (searchParams.filter ?? '') === filter.value
                  ? 'border-[#1a3a6b] bg-[#1a3a6b] text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <p className="text-gray-500">
            {searchParams.filter === 'buyer_interested'
              ? 'Aucun acheteur interesse par votre offre pour le moment.'
              : searchParams.filter === 'assigned'
                ? 'Aucune demande assignee a votre IMF pour le moment.'
              : searchParams.filter === 'needs_response'
                ? 'Aucune demande assignee sans reponse pour le moment.'
              : searchParams.filter === 'open_market'
                ? 'Aucune demande ouverte disponible pour le moment.'
              : searchParams.filter === 'my_offers'
                ? 'Aucune offre active pour le moment.'
              : searchParams.filter === 'accepted'
                ? 'Aucune offre retenue pour le moment.'
              : searchParams.filter === 'ready_to_disburse'
                ? 'Aucun dossier pret au decaissement pour le moment.'
              : searchParams.filter === 'disbursed'
                ? 'Aucun dossier finance pour le moment.'
              : 'Aucune demande assignee pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(app => {
            const v = app.listing?.vehicle;
            const buyer = app.buyer;
            const offer = offersByApplication.get(app.id);
            const assignedToThisMfi = institutionId && app.mfi_institution_id === institutionId;
            return (
              <Link
                key={app.id}
                href={`/mfi/applications/${app.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {buyer?.full_name ?? '—'} · {buyer?.city ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Zone {app.listing?.zone ?? '—'}
                      {app.listing?.asking_price
                        ? ` · ${formatXAF(app.listing.asking_price)}`
                        : ''}
                    </p>
                    {offer?.buyer_response === 'interested' && (
                      <p className="mt-2 inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        Acheteur interesse par votre offre
                      </p>
                    )}
                    {assignedToThisMfi && !offer && (
                      <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Assignee a votre IMF - reponse attendue
                      </p>
                    )}
                    {!assignedToThisMfi && !offer && (
                      <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        Ouverte aux offres partenaires
                      </p>
                    )}
                    {app.status === 'disbursed' && app.disbursed_at && (
                      <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Finance le {new Date(app.disbursed_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {offer ? `Offre: ${offer.status}` : STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
