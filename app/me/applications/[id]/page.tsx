import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ApplicationDetail from './ApplicationDetail';
import type { FinancingApplication, MFIApplicationOffer } from '@/lib/types';

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') redirect('/login');

  const [{ data, error }, { data: documentsData }, { data: offersData }] = await Promise.all([
    // ApplicationDetail is a client component, so every column selected here is
    // serialised into the buyer's browser whether it is rendered or not. `*`
    // was shipping the listing's internal valuation (mve_low, mve_high,
    // suggested_price), the staff assignments, the vehicle's VIN and inspection
    // notes, and each document's storage path and uploader. The component reads
    // none of it — it needs the fields below and nothing else.
    supabaseAdmin
      .from('financing_applications')
      .select(`
        id, status, notes, income_grade, down_payment_percent, max_tenor,
        submitted_at, decided_at, disbursed_at, created_at,
        listing:listings(id, asking_price, zone, vehicle:vehicles(make, model, year))
      `)
      .eq('id', params.id)
      .eq('buyer_id', user.id)
      .single(),
    // `documents` is polymorphic — entity_type/entity_id, with no foreign key to
    // financing_applications — so it cannot be embedded. The previous query
    // embedded `documents(*)` anyway, which PostgREST rejects with PGRST200; the
    // page treats any error as notFound(), so this route answered 404 for every
    // buyer who ever opened their own application.
    supabaseAdmin
      .from('documents')
      .select('id, doc_type, filename')
      .eq('entity_type', 'application')
      .eq('entity_id', params.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('mfi_application_offers')
      .select(`
        id, status, buyer_response, buyer_responded_at, notes,
        proposed_down_payment_percent, proposed_interest_rate_percent, proposed_tenor_months,
        institution:mfi_institutions(name, code)
      `)
      .eq('application_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (error || !data) notFound();

  const application = data as unknown as FinancingApplication & {
    offers?: Array<MFIApplicationOffer & { institution?: { name: string; code: string } | null }>;
  };
  application.offers = (offersData ?? []) as unknown as typeof application.offers;
  application.documents = (documentsData ?? []) as unknown as typeof application.documents;

  return (
    <div>
      <Link href="/me/applications" className="text-sm font-medium text-[#1a3a6b] hover:text-[#3d9e3d] transition-colors mb-6 inline-block">
        ← Retour aux demandes
      </Link>
      <ApplicationDetail application={application} />
    </div>
  );
}
