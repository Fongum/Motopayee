import { redirect } from 'next/navigation';
import { getCurrentUser, supabaseAdmin } from '@/lib/auth/server';
import type { Metadata } from 'next';
import DealerDashboardClient from './DealerDashboardClient';
import { dayKey } from '@/lib/daily-series';
import { dedupeContactEvents, type ContactEventRecord } from '@/lib/contact-events';
import {
  inventoryAttention,
  inventoryTotals,
  summarizeInventoryPerformance,
} from '@/lib/inventory-performance';

export const metadata: Metadata = { title: 'Tableau de bord concessionnaire — MotoPayee' };

const PERFORMANCE_DAYS = 30;

export default async function DealerPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'seller_dealer') redirect('/me/listings');

  // Fetch dealer stats
  const { data: listings } = await supabaseAdmin
    .from('listings')
    .select('id, status, asking_price, created_at, vehicle:vehicles(make, model, year)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  const allListings = (listings ?? []) as unknown as {
    id: string;
    status: string;
    asking_price: number;
    created_at: string;
    vehicle: { make: string; model: string; year: number } | null;
  }[];

  const stats = {
    total: allListings.length,
    published: allListings.filter((l) => l.status === 'published').length,
    sold: allListings.filter((l) => l.status === 'sold').length,
    draft: allListings.filter((l) => l.status === 'draft').length,
    totalRevenue: allListings
      .filter((l) => l.status === 'sold')
      .reduce((sum, l) => sum + l.asking_price, 0),
  };

  // 30-day demand per vehicle. Only live inventory is measured: a draft or a
  // sold vehicle scoring zero would read as a problem when it is not.
  const measuredIds = allListings.filter((l) => l.status === 'published').map((l) => l.id);
  const since = dayKey(new Date(Date.now() - PERFORMANCE_DAYS * 86_400_000));

  const [viewsRes, contactsRes, favouritesRes] = measuredIds.length
    ? await Promise.all([
        supabaseAdmin.from('listing_views').select('listing_id').in('listing_id', measuredIds).gte('date_day', since),
        supabaseAdmin
          .from('contact_events')
          .select('id, surface, listing_id, hire_listing_id, actor_id, visitor_key, date_day')
          .in('listing_id', measuredIds)
          .gte('date_day', since),
        supabaseAdmin.from('favourites').select('listing_id').in('listing_id', measuredIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const contactRows = (contactsRes.data ?? []) as unknown as ContactEventRecord[];
  const performanceRows = summarizeInventoryPerformance({
    listingIds: measuredIds,
    viewListingIds: ((viewsRes.data ?? []) as { listing_id: string }[]).map((r) => r.listing_id),
    // Deduped so one keen buyer clicking repeatedly is one contact.
    contactListingIds: dedupeContactEvents(contactRows)
      .map((r) => r.listing_id)
      .filter((id): id is string => !!id),
    favouriteListingIds: ((favouritesRes.data ?? []) as { listing_id: string }[]).map((r) => r.listing_id),
  });

  const totals = inventoryTotals(performanceRows);
  const attention = inventoryAttention(performanceRows);
  const performanceByListing = Object.fromEntries(performanceRows.map((row) => [row.listing_id, row]));

  // Recent conversations (leads)
  const { data: convs } = await supabaseAdmin
    .from('conversations')
    .select('id, last_message_at, listing:listings(id, vehicle:vehicles(make, model, year)), participant_a_profile:profiles!participant_a(full_name), participant_b_profile:profiles!participant_b(full_name)')
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
    .limit(10);

  const leads = (convs ?? []).map((c: Record<string, unknown>) => {
    const otherProfile = (c.participant_a_profile as unknown as { full_name: string | null })?.full_name === user.name
      ? c.participant_b_profile as unknown as { full_name: string | null }
      : c.participant_a_profile as unknown as { full_name: string | null };
    const listing = c.listing as unknown as { id: string; vehicle: { make: string; model: string; year: number } | null } | null;
    return {
      id: c.id as string,
      buyer_name: otherProfile?.full_name ?? 'Acheteur',
      vehicle: listing?.vehicle ? `${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}` : null,
      last_message_at: c.last_message_at as string,
    };
  });

  return (
    <DealerDashboardClient
      stats={stats}
      listings={allListings}
      leads={leads}
      performance={{
        days: PERFORMANCE_DAYS,
        totals,
        byListing: performanceByListing,
        ignoredIds: attention.ignored.map((row) => row.listing_id),
        invisibleIds: attention.invisible.map((row) => row.listing_id),
      }}
    />
  );
}
