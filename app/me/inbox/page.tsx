import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import { fetchUnreadCounts } from '@/lib/unread-messages.server';
import { unreadFor } from '@/lib/unread-messages';
import type { Metadata } from 'next';
import InboxClient from './InboxClient';
import { PORTAL_LIST_LIMIT } from '@/lib/portal-lists';

export const metadata: Metadata = { title: 'Messages — MotoPayee' };

export default async function InboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data } = await supabaseAdmin
    .from('conversations')
    .select(`
      *,
      participant_a_profile:profiles!participant_a(id, full_name),
      participant_b_profile:profiles!participant_b(id, full_name),
      listing:listings(id, asking_price, vehicle:vehicles(make, model, year)),
      hire_listing:hire_listings(id, make, model, year)
    `)
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
    .limit(PORTAL_LIST_LIMIT);

  // Get unread counts
  // Counted in Postgres (migration 042) rather than by fetching every unread
  // row and tallying it here.
  const unread = await fetchUnreadCounts(user.id);

  const conversations = (data ?? []).map((c: Record<string, unknown>) => {
    const otherUser = (c.participant_a as string) === user.id
      ? c.participant_b_profile as unknown as { id: string; full_name: string | null }
      : c.participant_a_profile as unknown as { id: string; full_name: string | null };
    const listing = c.listing as unknown as { id: string; asking_price: number; vehicle: { make: string; model: string; year: number } | null } | null;
    const hireListing = c.hire_listing as unknown as { id: string; make: string; model: string; year: number } | null;

    let subject = 'Conversation';
    if (listing?.vehicle) subject = `${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}`;
    else if (hireListing) subject = `${hireListing.year} ${hireListing.make} ${hireListing.model}`;

    return {
      id: c.id as string,
      other_name: otherUser?.full_name ?? 'Utilisateur',
      subject,
      last_message_at: c.last_message_at as string,
      unread: unreadFor(unread, c.id as string),
    };
  });

  return <InboxClient conversations={conversations} currentUserId={user.id} />;
}
