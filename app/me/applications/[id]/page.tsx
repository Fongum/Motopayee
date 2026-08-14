import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ApplicationDetail from './ApplicationDetail';
import type { FinancingApplication, MFIApplicationOffer } from '@/lib/types';

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') redirect('/login');

  const [{ data, error }, { data: offersData }] = await Promise.all([
    supabaseAdmin
      .from('financing_applications')
      .select(`
        *,
        listing:listings(*, vehicle:vehicles(*)),
        documents(*)
      `)
      .eq('id', params.id)
      .eq('buyer_id', user.id)
      .single(),
    supabaseAdmin
      .from('mfi_application_offers')
      .select('*, institution:mfi_institutions(name, code)')
      .eq('application_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (error || !data) notFound();

  const application = data as unknown as FinancingApplication & {
    offers?: Array<MFIApplicationOffer & { institution?: { name: string; code: string } | null }>;
  };
  application.offers = (offersData ?? []) as unknown as typeof application.offers;

  return (
    <div>
      <Link href="/me/applications" className="text-sm font-medium text-[#1a3a6b] hover:text-[#3d9e3d] transition-colors mb-6 inline-block">
        ← Retour aux demandes
      </Link>
      <ApplicationDetail application={application} />
    </div>
  );
}
