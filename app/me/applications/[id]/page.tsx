import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import ApplicationDetail from './ApplicationDetail';
import type { FinancingApplication } from '@/lib/types';

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'buyer') redirect('/login');

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .select(`
      *,
      listing:listings(*, vehicle:vehicles(*)),
      documents(*)
    `)
    .eq('id', params.id)
    .eq('buyer_id', user.id)
    .single();

  if (error || !data) notFound();

  return (
    <div>
      <Link href="/me/applications" className="text-sm text-blue-600 hover:underline mb-6 inline-block">
        ← Retour aux demandes
      </Link>
      <ApplicationDetail application={data as unknown as FinancingApplication} />
    </div>
  );
}
