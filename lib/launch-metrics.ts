import { supabaseAdmin } from '@/lib/auth/server';
import { dedupeContactEvents, type ContactEventRecord } from '@/lib/contact-events';
import {
  endOfLaunchWeek,
  groupWeeklyRows,
  recentWeekStarts,
  startOfLaunchWeek,
  weekStartKey,
  type WeeklyMetricValues,
  type WeeklySnapshot,
} from '@/lib/launch-weeks';

export * from '@/lib/launch-weeks';

/**
 * Count every scorecard metric for one week. Bounded at both ends so
 * recapturing a past week cannot absorb later activity.
 */
export async function computeWeeklyMetrics(weekStart: Date): Promise<WeeklyMetricValues> {
  const from = weekStart.toISOString();
  const to = endOfLaunchWeek(weekStart).toISOString();

  const [
    leadRows,
    { count: listingsReviewed },
    { count: listingsPublished },
    { count: rentalsPublished },
    { count: inspectionRequests },
    { count: financeApplications },
    { count: rentalBookings },
    contactRows,
  ] = await Promise.all([
    supabaseAdmin.from('launch_leads').select('lead_type').gte('created_at', from).lt('created_at', to),
    supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['ownership_verified', 'media_done', 'inspection_scheduled', 'inspected', 'pricing_review', 'published'])
      .gte('updated_at', from)
      .lt('updated_at', to),
    supabaseAdmin
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', from)
      .lt('published_at', to),
    supabaseAdmin
      .from('hire_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', from)
      .lt('published_at', to),
    supabaseAdmin.from('inspection_requests').select('*', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
    supabaseAdmin.from('financing_applications').select('*', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
    supabaseAdmin.from('hire_bookings').select('*', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
    supabaseAdmin
      .from('contact_events')
      .select('id, surface, listing_id, hire_listing_id, actor_id, visitor_key, date_day')
      .in('surface', ['listing', 'hire'])
      .gte('created_at', from)
      .lt('created_at', to),
  ]);

  const leads = (leadRows.data ?? []) as { lead_type: string }[];
  const countLeads = (type: string) => leads.filter((lead) => lead.lead_type === type).length;

  // Repeat clicks by one viewer on one vehicle in one day are a single inquiry.
  const inquiries = dedupeContactEvents((contactRows.data ?? []) as unknown as ContactEventRecord[]);

  return {
    seller_contacts: countLeads('seller'),
    dealer_contacts: countLeads('dealer'),
    rental_owner_contacts: countLeads('rental_owner'),
    mfi_contacts: countLeads('mfi'),
    listings_reviewed: listingsReviewed ?? 0,
    listings_published: listingsPublished ?? 0,
    rentals_published: rentalsPublished ?? 0,
    inspection_requests: inspectionRequests ?? 0,
    finance_applications: financeApplications ?? 0,
    rental_bookings: rentalBookings ?? 0,
    buyer_inquiries: inquiries.filter((row) => row.surface === 'listing').length,
    renter_inquiries: inquiries.filter((row) => row.surface === 'hire').length,
  };
}

/**
 * Compute and persist one week. Idempotent: recapturing the in-progress week
 * overwrites its row, so the figure only ever gets more complete.
 */
export async function captureWeeklyMetrics(weekStart: Date = startOfLaunchWeek(new Date())) {
  const values = await computeWeeklyMetrics(weekStart);
  const key = weekStartKey(weekStart);
  const capturedAt = new Date().toISOString();

  const { error } = await supabaseAdmin.from('launch_weekly_metrics').upsert(
    Object.entries(values).map(([metric_key, value]) => ({
      week_start: key,
      metric_key,
      value,
      captured_at: capturedAt,
    })),
    { onConflict: 'week_start,metric_key' }
  );

  return { weekStart: key, values, error };
}

/** Stored history for the last `weeks` weeks, oldest first. */
export async function loadWeeklyHistory(weeks = 4, now: Date = new Date()): Promise<WeeklySnapshot[]> {
  const wanted = recentWeekStarts(weeks, now);

  const { data } = await supabaseAdmin
    .from('launch_weekly_metrics')
    .select('week_start, metric_key, value')
    .gte('week_start', wanted[0])
    .order('week_start', { ascending: true });

  return groupWeeklyRows((data ?? []) as { week_start: string; metric_key: string; value: number }[]);
}
