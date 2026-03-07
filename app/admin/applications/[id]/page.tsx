import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { isAdminRole, isVerifierRole } from '@/lib/auth/roles';
import type { FinancingApplication, MFIInstitution, Payment } from '@/lib/types';
import PaymentRequestForm from '@/app/(components)/PaymentRequestForm';
import AssignMFIForm from '@/app/(components)/AssignMFIForm';

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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Soumis', docs_pending: 'Docs requis',
  docs_received: 'Docs reçus', under_review: 'En examen',
  approved: 'Approuvé', rejected: 'Refusé', disbursed: 'Financé', withdrawn: 'Annulé',
};

export default async function AdminApplicationDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [appResult, paymentsResult, institutionsResult] = await Promise.all([
    supabaseAdmin
      .from('financing_applications')
      .select(`
        *,
        listing:listings(*, vehicle:vehicles(*)),
        buyer:profiles!buyer_id(id, email, full_name, phone, city, zone),
        verifier:profiles!verifier_id(id, email, full_name),
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
  ]);

  const { data, error } = appResult;

  if (error || !data) notFound();

  const app = data as unknown as FinancingApplication & {
    mfi_institution_id?: string | null;
    buyer?: { id: string; email: string; full_name?: string; phone?: string; city?: string; zone?: string };
    verifier?: { id: string; email: string; full_name?: string } | null;
  };

  const payments = (paymentsResult.data ?? []) as Payment[];
  const institutions = (institutionsResult.data ?? []) as Pick<MFIInstitution, 'id' | 'name' | 'code'>[];

  const canAct = isAdminRole(user.role) || isVerifierRole(user.role);
  const transitions = STATUS_TRANSITIONS[app.status] ?? [];
  const listing = app.listing as { asking_price: number; zone: string; vehicle?: { make: string; model: string; year: number } } | undefined;
  const v = listing?.vehicle;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/applications" className="text-sm text-blue-600 hover:underline">← Demandes</Link>
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
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-gray-50 py-1">
                <dt className="text-gray-500">{l}</dt>
                <dd className="font-medium text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

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
                  className="text-xs text-blue-600 hover:underline"
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
