import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import type { Metadata } from 'next';
import ReferralClient from './ReferralClient';

export const metadata: Metadata = { title: 'Parrainage — MotoPayee' };

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <ReferralClient />;
}
