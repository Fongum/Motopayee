import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { FinancingApplication, Payment } from '@/lib/types';
import MFIOfferForm from './MFIOfferForm';

function formatXAF(n: number) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency', currency: 'XAF', maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Soumis', docs_pending: 'Docs requis',
  docs_received: 'Docs reçus', under_review: 'En examen',
  approved: 'Approuvé', rejected: 'Refusé', disbursed: 'Financé', withdrawn: 'Annulé',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  successful: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default async function MFIApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'mfi_partner' && user.role !== 'admin') redirect('/');

  let institutionId: string | null = null;
  if (user.role === 'mfi_partner') {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('mfi_institution_id')
      .eq('id', user.id)
      .single();
    institutionId =
      (profile as { mfi_institution_id: string | null } | null)?.mfi_institution_id ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .select(`
      *,
      listing:listings(*, vehicle:vehicles(*)),
      buyer:profiles!buyer_id(id, email, full_name, phone, city, zone)
    `)
    .eq('id', params.id)
    .single();

  if (error || !data) notFound();

  const app = data as unknown as FinancingApplication & {
    mfi_institution_id?: string | null;
    disbursed_at?: string | null;
    buyer?: {
      id: string;
      email: string;
      full_name?: string;
      phone?: string;
      city?: string;
      zone?: string;
    };
  };

  const listing = app.listing as {
    asking_price: number;
    zone: string;
    financeable?: boolean;
    vehicle?: { make: string; model: string; year: number };
  } | undefined;
  const v = listing?.vehicle;
  const openToMFI = Boolean(listing?.financeable && ['submitted', 'docs_received', 'under_review', 'approved'].includes(app.status));

  // An MFI partner sees only files routed to their institution. This page
  // shows the applicant, their documents and their payment history, so being
  // "open to MFIs" is not on its own a reason to show it to every partner.
  // openToMFI still gates whether an offer can be made, below.
  if (institutionId && app.mfi_institution_id !== institutionId) notFound();

  const { data: paymentsData } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('application_id', params.id)
    .order('initiated_at', { ascending: false });

  const payments = (paymentsData ?? []) as Payment[];
  const { data: offerRows } = institutionId
    ? await supabaseAdmin
      .from('mfi_application_offers')
      .select('*')
      .eq('application_id', params.id)
      .eq('mfi_institution_id', institutionId)
      .limit(1)
    : { data: [] };
  const existingOffer = ((offerRows ?? [])[0] ?? null) as {
    status: string;
    buyer_response: string | null;
    buyer_responded_at: string | null;
    proposed_down_payment_percent: number | null;
    proposed_tenor_months: number | null;
    proposed_interest_rate_percent: number | null;
    notes: string | null;
  } | null;

  const canDisburse = app.status === 'approved' && existingOffer?.status === 'accepted';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/mfi/applications" className="text-sm text-[#1a3a6b] hover:text-[#3d9e3d]">
          ← Demandes
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          {v ? `${v.year} ${v.make} ${v.model}` : 'Véhicule'}
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
            ].map(([l, val]) => (
              <div key={l} className="flex justify-between border-b border-gray-50 py-1">
                <dt className="text-gray-500">{l}</dt>
                <dd className="font-medium text-gray-800">{val}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Financing terms */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Conditions</h2>
          <dl className="text-sm space-y-1">
            {[
              ['Prix', listing ? formatXAF(listing.asking_price) : '—'],
              ['Apport', app.down_payment_percent ? `${app.down_payment_percent}%` : '—'],
              ['Durée max', app.max_tenor ? `${app.max_tenor} mois` : '—'],
              ['Revue manuelle', app.manual_review_required ? 'Oui' : 'Non'],
              [
                'Financé le',
                app.disbursed_at
                  ? new Date(app.disbursed_at).toLocaleDateString('fr-FR')
                  : '—',
              ],
            ].map(([l, val]) => (
              <div key={l} className="flex justify-between border-b border-gray-50 py-1">
                <dt className="text-gray-500">{l}</dt>
                <dd className="font-medium text-gray-800">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {institutionId && openToMFI && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Reponse de votre IMF</h2>
          <p className="text-sm text-gray-500 mb-4">
            Soumettez les conditions que votre institution peut proposer pour ce dossier.
          </p>
          {existingOffer?.buyer_response && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              existingOffer.buyer_response === 'interested'
                ? 'border-green-100 bg-green-50 text-green-700'
                : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              Reponse acheteur: {existingOffer.buyer_response === 'interested' ? 'interesse par votre offre' : 'pas interesse'}
              {existingOffer.buyer_responded_at
                ? ` le ${new Date(existingOffer.buyer_responded_at).toLocaleDateString('fr-FR')}`
                : ''}
            </div>
          )}
          <MFIOfferForm applicationId={params.id} existingOffer={existingOffer} />
        </div>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Paiements ({payments.length})
          </h2>
          <div className="space-y-2">
            {payments.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm py-2 border-b border-gray-50"
              >
                <div>
                  <span className="font-medium">
                    {p.provider === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'}
                  </span>
                  <span className="text-gray-500 ml-2">{formatXAF(p.amount)}</span>
                  <span className="text-gray-400 ml-2">· {p.phone}</span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disburse action */}
      {canDisburse && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Décaissement</h2>
          <p className="text-sm text-gray-500 mb-4">
            Confirmez que les fonds ont été décaissés à l&apos;acheteur. Cette action est
            irréversible.
          </p>
          <form action={`/api/mfi/applications/${params.id}/disburse`} method="POST">
            <button
              type="submit"
              className="bg-green-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700"
            >
              Confirmer le décaissement
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
