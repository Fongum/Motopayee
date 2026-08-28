import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { isAdminRole, isVerifierRole } from '@/lib/auth/roles';
import type { FinancingApplication, MFIApplicationOffer, MFIInstitution, Payment } from '@/lib/types';
import PaymentRequestForm from '@/app/(components)/PaymentRequestForm';
import AssignMFIForm from '@/app/(components)/AssignMFIForm';
import MFIOfferActions from './MFIOfferActions';

function formatXAF(amount: number) {
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(amount);
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ['docs_pending', 'under_review', 'withdrawn'],
  docs_pending: ['docs_received', 'withdrawn'],
  docs_received: ['under_review', 'withdrawn'],
  under_review: ['approved', 'rejected'],
  approved: ['disbursed'],
};

const FOLLOW_UP_LABELS: Record<string, string> = {
  none: 'Aucun suivi',
  call_needed: 'Appel requis',
  contacted: 'Contacte',
  waiting_buyer: 'Attente acheteur',
  waiting_mfi: 'Attente IMF',
  closed: 'Suivi clos',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Soumis', docs_pending: 'Docs requis',
  docs_received: 'Docs reçus', under_review: 'En examen',
  approved: 'Approuvé', rejected: 'Refusé', disbursed: 'Financé', withdrawn: 'Annulé',
};

export default async function AdminApplicationDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [appResult, paymentsResult, institutionsResult, offersResult] = await Promise.all([
    supabaseAdmin
      .from('financing_applications')
      .select(`
        *,
        listing:listings(*, vehicle:vehicles(*)),
        buyer:profiles!buyer_id(id, email, full_name, phone, city, zone),
        verifier:profiles!verifier_id(id, email, full_name),
        follow_up_actor:profiles!follow_up_actor_id(id, email, full_name),
        documents(*)
      `)
      .eq('id', params.id)
      .single(),
    supabaseAdmin
      .from('payments')
      .select('*')
      .eq('application_id', params.id)
      .order('initiated_at', { ascending: false }),
    isAdminRole(user.role)
      ? supabaseAdmin
          .from('mfi_institutions')
          .select('id, name, code')
          .eq('active', true)
          .order('name')
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from('mfi_application_offers')
      .select('*, institution:mfi_institutions(name, code), responder:profiles!responder_id(full_name, email)')
      .eq('application_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  const { data, error } = appResult;

  if (error || !data) notFound();

  const app = data as unknown as FinancingApplication & {
    mfi_institution_id?: string | null;
    buyer?: { id: string; email: string; full_name?: string; phone?: string; city?: string; zone?: string };
    verifier?: { id: string; email: string; full_name?: string } | null;
    follow_up_actor?: { id: string; email: string; full_name?: string } | null;
  };

  const payments = (paymentsResult.data ?? []) as Payment[];
  const institutions = (institutionsResult.data ?? []) as Pick<MFIInstitution, 'id' | 'name' | 'code'>[];
  const offers = (offersResult.data ?? []) as unknown as Array<MFIApplicationOffer & {
    institution?: { name: string; code: string } | null;
    responder?: { full_name: string | null; email: string | null } | null;
  }>;

  const canAct = isAdminRole(user.role) || isVerifierRole(user.role);
  const transitions = STATUS_TRANSITIONS[app.status] ?? [];
  const listing = app.listing as { asking_price: number; zone: string; vehicle?: { make: string; model: string; year: number } } | undefined;
  const v = listing?.vehicle;
  const activeOffers = offers.filter((offer) => ['submitted', 'shortlisted', 'accepted'].includes(offer.status));
  const offersAwaitingBuyer = activeOffers.filter((offer) => !offer.buyer_response).length;
  const interestedOffers = activeOffers.filter((offer) => offer.buyer_response === 'interested').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/applications" className="text-sm text-[#1a3a6b] hover:text-[#3d9e3d]">← Demandes</Link>
        <h1 className="text-xl font-bold text-gray-900">
          Demande — {v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule'}
        </h1>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
          {STATUS_LABELS[app.status] ?? app.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buyer info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Acheteur</h2>
          <dl className="text-sm space-y-1">
            {[
              ['Nom', app.buyer?.full_name ?? '—'],
              ['Email', app.buyer?.email ?? '—'],
              ['Téléphone', app.buyer?.phone ?? '—'],
              ['Ville', app.buyer?.city ?? '—'],
              ['Zone', app.buyer?.zone ?? '—'],
              ['Grade revenu', app.income_grade ?? 'Non défini'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-gray-50 py-1">
                <dt className="text-gray-500">{l}</dt>
                <dd className="font-medium text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Financing terms */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Conditions de financement</h2>
          <dl className="text-sm space-y-1">
            {[
              ['Prix du véhicule', listing ? formatXAF(listing.asking_price) : '—'],
              ['Apport initial', app.down_payment_percent ? `${app.down_payment_percent}%` : '—'],
              ['Durée max', app.max_tenor ? `${app.max_tenor} mois` : '—'],
              ['Revue manuelle', app.manual_review_required ? 'Oui' : 'Non'],
              ['Decaisse le', app.disbursed_at ? new Date(app.disbursed_at).toLocaleDateString('fr-FR') : 'â€”'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-gray-50 py-1">
                <dt className="text-gray-500">{l}</dt>
                <dd className="font-medium text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {offers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Offres IMF ({offers.length})</h2>
              <p className="mt-1 text-sm text-gray-500">
                {activeOffers.length} active, {offersAwaitingBuyer} a presenter, {interestedOffers} avec interet acheteur.
              </p>
            </div>
            <Link
              href="/admin/applications?status=offers_waiting_buyer"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              File offres a presenter
            </Link>
          </div>
          <div className="space-y-3">
            {offers.map((offer) => (
              <div key={offer.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {offer.institution?.name ?? 'IMF'}
                      {offer.institution?.code ? ` (${offer.institution.code})` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Repondu par {offer.responder?.full_name ?? offer.responder?.email ?? 'partenaire'} le {new Date(offer.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {offer.status}
                  </span>
                </div>
                {offer.buyer_response && (
                  <div className={`mb-3 rounded-lg border px-3 py-2 text-xs font-medium ${
                    offer.buyer_response === 'interested'
                      ? 'border-green-100 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}>
                    Reponse acheteur: {offer.buyer_response === 'interested' ? 'interesse' : 'pas interesse'}
                    {offer.buyer_responded_at ? ` le ${new Date(offer.buyer_responded_at).toLocaleDateString('fr-FR')}` : ''}
                  </div>
                )}
                {!offer.buyer_response && ['submitted', 'shortlisted', 'accepted'].includes(offer.status) && (
                  <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    A presenter a l&apos;acheteur et enregistrer sa reponse.
                  </div>
                )}
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">Apport propose</p>
                    <p className="font-semibold text-gray-900">
                      {offer.proposed_down_payment_percent != null ? `${offer.proposed_down_payment_percent}%` : 'Non indique'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Duree proposee</p>
                    <p className="font-semibold text-gray-900">
                      {offer.proposed_tenor_months != null ? `${offer.proposed_tenor_months} mois` : 'Non indique'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Taux propose</p>
                    <p className="font-semibold text-gray-900">
                      {offer.proposed_interest_rate_percent != null ? `${offer.proposed_interest_rate_percent}%` : 'Non indique'}
                    </p>
                  </div>
                </div>
                {offer.notes && <p className="mt-3 text-sm leading-relaxed text-gray-600">{offer.notes}</p>}
                {canAct && (
                  <MFIOfferActions
                    applicationId={params.id}
                    offerId={offer.id}
                    currentStatus={offer.status}
                    buyerResponse={offer.buyer_response}
                    institutionName={offer.institution?.name ?? offer.institution?.code ?? 'IMF offer'}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {canAct && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-gray-900">Suivi operationnel</h2>
              <p className="text-sm text-gray-500 mt-1">Notes internes pour relancer l&apos;acheteur ou l&apos;IMF.</p>
              {app.follow_up_actor && (
                <p className="text-xs text-gray-400 mt-1">
                  Dernier suivi par {app.follow_up_actor.full_name ?? app.follow_up_actor.email}
                  {app.follow_up_updated_at ? ` le ${new Date(app.follow_up_updated_at).toLocaleDateString('fr-FR')}` : ''}
                </p>
              )}
            </div>
            {app.follow_up_status && app.follow_up_status !== 'none' && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                {FOLLOW_UP_LABELS[app.follow_up_status] ?? app.follow_up_status}
              </span>
            )}
          </div>
          <form action={`/api/admin/applications/${params.id}/follow-up`} method="POST" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Statut de suivi</span>
                <select
                  name="follow_up_status"
                  defaultValue={app.follow_up_status ?? 'none'}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {Object.entries(FOLLOW_UP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-500">Prochaine relance</span>
                <input
                  type="datetime-local"
                  name="next_follow_up_at"
                  defaultValue={app.next_follow_up_at ? app.next_follow_up_at.slice(0, 16) : ''}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Notes de suivi</span>
              <textarea
                name="follow_up_notes"
                defaultValue={app.follow_up_notes ?? ''}
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ex: Acheteur interesse par l'offre IMF, appeler pour confirmer apport et documents."
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-[#1a3a6b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132a4d]"
            >
              Enregistrer le suivi
            </button>
          </form>
        </div>
      )}

      {/* Documents */}
      {app.documents && app.documents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Documents ({app.documents.length})</h2>
          <div className="space-y-2">
            {app.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                <div>
                  <span className="font-medium text-gray-800">{doc.filename}</span>
                  <span className="ml-2 text-xs text-gray-400">{doc.doc_type.replace(/_/g, ' ')}</span>
                  {doc.verified && <span className="ml-2 text-xs text-green-600">✓ Vérifié</span>}
                </div>
                <a
                  href={`/api/files/signed-url?doc=${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#1a3a6b] hover:text-[#3d9e3d]"
                >
                  Télécharger
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {canAct && transitions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Changer le statut</h2>
          <div className="flex flex-wrap gap-3">
            {transitions.map((target) => (
              <form key={target} action={`/api/admin/applications/${params.id}/status`} method="POST">
                <input type="hidden" name="status" value={target} />
                <button
                  type="submit"
                  className="text-sm font-semibold px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  → {STATUS_LABELS[target]}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Assign MFI — admin only */}
      {isAdminRole(user.role) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Assigner une IMF</h2>
          <AssignMFIForm
            applicationId={params.id}
            currentMFIId={app.mfi_institution_id}
            institutions={institutions}
          />
        </div>
      )}

      {/* Payments */}
      {canAct && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Paiements Mobile Money</h2>
          <PaymentRequestForm
            applicationId={params.id}
            applicationStatus={app.status}
            askingPrice={listing?.asking_price ?? 0}
            buyerPhone={app.buyer?.phone}
            existingPayments={payments}
          />
        </div>
      )}

      {/* Export */}
      {(isAdminRole(user.role) || isVerifierRole(user.role)) && (
        <div className="flex justify-end">
          <a
            href={`/api/admin/export/applications/${params.id}`}
            className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
          >
            Exporter pour IMF (JSON)
          </a>
        </div>
      )}
    </div>
  );
}
