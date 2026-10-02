import { supabaseAdmin } from '@/lib/auth/server';
import { buildDailySeries, dayKey, type DailyPoint } from '@/lib/daily-series';
import {
  CONTACT_EVENT_COLUMNS,
  dedupeContactEvents,
  type ContactEventRecord,
} from '@/lib/contact-events';
import { fetchAllRows } from '@/lib/fetch-all-rows';

export interface ListingAnalytics {
  total_views: number;
  views_7d: number;
  favourites_count: number;
  contacts_30d: number;
  contacts_7d: number;
  contact_clicks_30d: number;
  by_day: DailyPoint[];
  contacts_by_day: DailyPoint[];
}

/**
 * Seller-facing stats for one listing. Shared by the analytics page and
 * `GET /api/seller/listings/[id]/analytics`, which had been two hand-copied
 * versions of the same queries. Ownership is the caller's job.
 *
 * `listing_views` holds one row per page view, so a popular listing passes
 * PostgREST's 1000-row cap inside the 30-day window; the per-day series is
 * paged for that reason. Totals use head counts, which have no cap.
 */
export async function getListingAnalytics(listingId: string): Promise<ListingAnalytics> {
  const ago7d = dayKey(new Date(Date.now() - 7 * 86_400_000));
  const ago30d = dayKey(new Date(Date.now() - 30 * 86_400_000));

  const [totalRes, week7Res, byDayRes, favRes, contactsRes] = await Promise.all([
    supabaseAdmin.from('listing_views').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
    supabaseAdmin
      .from('listing_views')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .gte('date_day', ago7d),
    fetchAllRows((from, to) =>
      supabaseAdmin
        .from('listing_views')
        .select('date_day')
        .eq('listing_id', listingId)
        .gte('date_day', ago30d)
        .order('id')
        .range(from, to)),
    supabaseAdmin.from('favourites').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
    // Deduped in code rather than counted in SQL, which keeps the raw click
    // count (contact_clicks_30d) available alongside the unique one.
    fetchAllRows((from, to) =>
      supabaseAdmin
        .from('contact_events')
        .select(CONTACT_EVENT_COLUMNS)
        .eq('listing_id', listingId)
        .gte('date_day', ago30d)
        .order('id')
        .range(from, to)),
  ]);

  const viewDays = (byDayRes.data as { date_day: string }[]).map((row) => row.date_day);
  const contactRows = contactsRes.data as unknown as ContactEventRecord[];
  const contacts = dedupeContactEvents(contactRows);

  return {
    total_views: totalRes.count ?? 0,
    views_7d: week7Res.count ?? 0,
    favourites_count: favRes.count ?? 0,
    contacts_30d: contacts.length,
    contacts_7d: contacts.filter((row) => row.date_day >= ago7d).length,
    contact_clicks_30d: contactRows.length,
    by_day: buildDailySeries(viewDays, 30),
    contacts_by_day: buildDailySeries(contacts.map((row) => row.date_day), 30),
  };
}
