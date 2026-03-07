import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import type { FinancingApplication, Payment } from '@/lib/types';

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

  // MFI partner can only access applications assigned to their institution
  if (institutionId && app.mfi_institution_id !== institutionId) notFound();

  const listing = app.listing as {
    asking_price: number;
    zone: string;
    vehicle?: { make: string; model: string; year: number };
  } | undefined;
  const v = listing?.vehicle;

  const { data: paymentsData } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('application_id', params.id)
    .order('initiated_at', { ascending: false });

  const payments = (paymentsData ?? []) as Payment[];

  const canDisburse = app.status === 'approved';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/mfi/applications" className="text-sm text-blue-600 hover:underline">
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
