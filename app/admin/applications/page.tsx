import { supabaseAdmin } from '@/lib/auth/server';
import { requireAdminPage } from '@/lib/auth/admin-access';
import { isAdminRole } from '@/lib/auth/roles';
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

const ACTIVE_FOLLOW_UP_STATUSES = ['call_needed', 'contacted', 'waiting_buyer', 'waiting_mfi'];

const FOLLOW_UP_LABELS: Record<string, string> = {
  call_needed: 'Appel requis',
  contacted: 'Contacte',
  waiting_buyer: 'Attente acheteur',
  waiting_mfi: 'Attente IMF',
};

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const user = await requireAdminPage('applications');

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10));
  const PAGE_SIZE = 25;
  let offerFilteredApplicationIds: string[] | null = null;
  const returnTo = `/admin/applications${searchParams.status ? `?status=${searchParams.status}` : ''}`;
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  if (searchParams.status === 'buyer_interested' || searchParams.status === 'offers_waiting_buyer') {
    let offerQuery = supabaseAdmin
      .from('mfi_application_offers')
      .select('application_id');

    offerQuery = searchParams.status === 'buyer_interested'
      ? offerQuery.eq('buyer_response', 'interested')
      : offerQuery.in('status', ['submitted', 'shortlisted', 'accepted']).is('buyer_response', null);

    const { data: matchingOffers } = await offerQuery;

    offerFilteredApplicationIds = Array.from(new Set((matchingOffers ?? []).map((offer) => offer.application_id as string)));
  }

  let query = supabaseAdmin
    .from('financing_applications')
    .select(`
      *,
      listing:listings(id, asking_price, zone, vehicle:vehicles(make, model, year)),
      buyer:profiles!buyer_id(id, email, full_name),
      mfi:mfi_institutions(name, code),
      follow_up_actor:profiles!follow_up_actor_id(id, email, full_name)
    `, { count: 'exact' })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (searchParams.status === 'buyer_interested' || searchParams.status === 'offers_waiting_buyer') {
    query = offerFilteredApplicationIds && offerFilteredApplicationIds.length > 0
      ? query.in('id', offerFilteredApplicationIds)
      : query.eq('id', '00000000-0000-0000-0000-000000000000');
  } else if (searchParams.status === 'follow_up_due') {
    query = query
      .in('follow_up_status', ACTIVE_FOLLOW_UP_STATUSES)
      .lte('next_follow_up_at', new Date().toISOString());
  } else if (searchParams.status === 'follow_up') {
    query = query.in('follow_up_status', ACTIVE_FOLLOW_UP_STATUSES);
  } else if (searchParams.status === 'active') {
    query = query.in('status', ['submitted', 'docs_pending', 'docs_received', 'under_review']);
  } else if (searchParams.status === 'mfi_unassigned') {
    query = query
      .in('status', ['submitted', 'docs_received', 'under_review'])
      .is('mfi_institution_id', null);
  } else if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  query = ['follow_up', 'follow_up_due'].includes(searchParams.status ?? '')
    ? query.order('next_follow_up_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
    : query.order('created_at', { ascending: false });

  const { data, count } = await query;
  const apps = data ?? [];
  const { data: institutionsData } = isAdminRole(user.role)
    ? await supabaseAdmin
        .from('mfi_institutions')
        .select('id, name, code')
        .eq('active', true)
        .order('name')
    : { data: [] };
  const institutions = (institutionsData ?? []) as Array<{ id: string; name: string; code: string }>;
  const applicationIds = apps.map((app) => app.id as string);
  const { data: offerRows } = applicationIds.length > 0
    ? await supabaseAdmin
      .from('mfi_application_offers')
      .select('application_id, status, buyer_response')
      .in('application_id', applicationIds)
      .in('status', ['submitted', 'shortlisted', 'accepted'])
    : { data: [] };
  const offerSignals = new Map<string, { total: number; interested: boolean; accepted: boolean; awaitingBuyer: boolean }>();
  ((offerRows ?? []) as Array<{ application_id: string; status: string; buyer_response: string | null }>).forEach((offer) => {
    const current = offerSignals.get(offer.application_id) ?? { total: 0, interested: false, accepted: false, awaitingBuyer: false };
    current.total += 1;
    current.interested = current.interested || offer.buyer_response === 'interested';
    current.accepted = current.accepted || offer.status === 'accepted';
    current.awaitingBuyer = current.awaitingBuyer || offer.buyer_response == null;
    offerSignals.set(offer.application_id, current);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demandes de financement</h1>
        <span className="text-sm text-gray-500">{count ?? 0} total</span>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'active', 'mfi_unassigned', 'offers_waiting_buyer', 'buyer_interested', 'follow_up', 'follow_up_due', 'submitted', 'under_review', 'approved', 'disbursed', 'rejected'].map((s) => (
          <Link
            key={s}
            href={s ? `/admin/applications?status=${s}` : '/admin/applications'}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              searchParams.status === s || (!searchParams.status && !s)
                ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s === '' ? 'Tous' : s === 'active' ? 'En cours' : s === 'mfi_unassigned' ? 'A router IMF' : s === 'offers_waiting_buyer' ? 'Offres a presenter' : s === 'buyer_interested' ? 'Acheteurs interesses' : s === 'follow_up' ? 'Suivi ouvert' : s === 'follow_up_due' ? 'Relances dues' : STATUS_LABELS[s] ?? s}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Acheteur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Véhicule</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">IMF</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Relance</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apps.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucune demande</td></tr>
            ) : apps.map((app: Record<string, unknown>) => {
              const buyer = app.buyer as { email: string; full_name?: string } | undefined;
              const followUpActor = app.follow_up_actor as { email: string; full_name?: string } | undefined;
              const listing = app.listing as { asking_price: number; zone: string; vehicle?: { make: string; model: string; year: number } } | undefined;
              const mfi = app.mfi as { name?: string | null; code?: string | null } | undefined;
              const v = listing?.vehicle;
              const signals = offerSignals.get(app.id as string);
              const appStatus = app.status as string;
              const followUpStatus = app.follow_up_status as string | undefined;
              const followUpUpdatedAt = app.follow_up_updated_at as string | null | undefined;
              const disbursedAt = app.disbursed_at as string | null | undefined;
              const nextFollowUpAt = app.next_follow_up_at as string | null | undefined;
              const nextFollowUpDate = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
              const isOverdue = nextFollowUpDate ? nextFollowUpDate.getTime() <= Date.now() : false;
              return (
                <tr key={app.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{buyer?.full_name ?? buyer?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v ? `${v.year} ${v.make} ${v.model}` : '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {mfi?.name || mfi?.code ? (
                      <div>
                        <p className="font-semibold text-gray-800">{mfi.name ?? mfi.code}</p>
                        {mfi.code && <p className="mt-0.5 text-gray-400">{mfi.code}</p>}
                      </div>
                    ) : isAdminRole(user.role) && institutions.length > 0 ? (
                      <form action={`/api/admin/applications/${app.id}/assign-mfi`} method="POST" className="flex gap-1">
                        <input type="hidden" name="return_to" value={returnTo} />
                        <select name="mfi_institution_id" required className="min-w-36 rounded border border-gray-300 px-2 py-1 text-xs">
                          <option value="">Router</option>
                          {institutions.map((institution) => (
                            <option key={institution.id} value={institution.id}>
                              {institution.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
                          OK
                        </button>
                      </form>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {STATUS_LABELS[app.status as string] ?? app.status as string}
                    </span>
                    {signals?.interested && (
                      <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        Acheteur interesse
                      </span>
                    )}
                    {signals?.awaitingBuyer && (
                      <span className="ml-2 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        Offre a presenter
                      </span>
                    )}
                    {signals && !signals.interested && signals.total > 0 && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {signals.total} offre{signals.total > 1 ? 's' : ''}
                      </span>
                    )}
                    {signals?.accepted && (
                      <span className="ml-2 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        Offre retenue
                      </span>
                    )}
                    {followUpStatus && !['none', 'closed'].includes(followUpStatus) && (
                      <span className="ml-2 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                        Suivi
                      </span>
                    )}
                    {appStatus === 'disbursed' && disbursedAt && (
                      <span className="ml-2 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        Finance le {new Date(disbursedAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {followUpStatus && ACTIVE_FOLLOW_UP_STATUSES.includes(followUpStatus) ? (
                      <div>
                        <p className="font-medium text-gray-700">{FOLLOW_UP_LABELS[followUpStatus] ?? followUpStatus}</p>
                        <p className={isOverdue ? 'text-red-600' : 'text-gray-400'}>
                          {nextFollowUpDate
                            ? `${isOverdue ? 'Due' : 'Le'} ${nextFollowUpDate.toLocaleDateString('fr-FR')}`
                            : 'Date non definie'}
                        </p>
                        {followUpActor && (
                          <p className="mt-1 text-gray-400">
                            Par {followUpActor.full_name ?? followUpActor.email}
                            {followUpUpdatedAt ? ` le ${new Date(followUpUpdatedAt).toLocaleDateString('fr-FR')}` : ''}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          <form action={`/api/admin/applications/${app.id}/follow-up`} method="POST">
                            <input type="hidden" name="follow_up_status" value="contacted" />
                            <input type="hidden" name="next_follow_up_at" value={twoDaysFromNow} />
                            <input type="hidden" name="return_to" value={returnTo} />
                            <button
                              type="submit"
                              className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Contacte
                            </button>
                          </form>
                          <form action={`/api/admin/applications/${app.id}/follow-up`} method="POST">
                            <input type="hidden" name="follow_up_status" value="closed" />
                            <input type="hidden" name="next_follow_up_at" value="" />
                            <input type="hidden" name="return_to" value={returnTo} />
                            <button
                              type="submit"
                              className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                            >
                              Clore
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(app.created_at as string).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/applications/${app.id}`} className="text-[#1a3a6b] hover:text-[#3d9e3d] text-xs">Voir →</Link>
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
