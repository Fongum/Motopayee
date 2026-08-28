import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { buildDailySeries, dayKey } from '@/lib/daily-series';
import { dedupeContactEvents, type ContactEventRecord } from '@/lib/contact-events';

interface RouteParams { params: { id: string } }

const CONTACT_COLUMNS = 'id, surface, listing_id, hire_listing_id, actor_id, visitor_key, date_day';

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Verify seller owns this listing
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id')
    .eq('id', params.id)
    .single();

  if (!listing || (listing as { seller_id: string }).seller_id !== auth.user.id) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const ago7d  = dayKey(new Date(Date.now() - 7  * 86_400_000));
  const ago30d = dayKey(new Date(Date.now() - 30 * 86_400_000));

  const [totalRes, week7Res, byDayRes, favRes, contactsRes] = await Promise.all([
    supabaseAdmin
      .from('listing_views')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', params.id),
    supabaseAdmin
      .from('listing_views')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', params.id)
      .gte('date_day', ago7d),
    supabaseAdmin
      .from('listing_views')
      .select('date_day')
      .eq('listing_id', params.id)
      .gte('date_day', ago30d)
      .order('date_day'),
    supabaseAdmin
      .from('favourites')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', params.id),
    // Deduped in code rather than counted in SQL: one listing's 30-day window
    // is a small set, and it keeps the raw click rows available.
    supabaseAdmin
      .from('contact_events')
      .select(CONTACT_COLUMNS)
      .eq('listing_id', params.id)
      .gte('date_day', ago30d)
      .order('date_day'),
  ]);

  const viewDays = ((byDayRes.data ?? []) as { date_day: string }[]).map((row) => row.date_day);
  const contactRows = (contactsRes.data ?? []) as unknown as ContactEventRecord[];
  const contacts = dedupeContactEvents(contactRows);

  return NextResponse.json({
    total_views: totalRes.count ?? 0,
    views_7d: week7Res.count ?? 0,
    favourites_count: favRes.count ?? 0,
    contacts_30d: contacts.length,
    contacts_7d: contacts.filter((row) => row.date_day >= ago7d).length,
    contact_clicks_30d: contactRows.length,
    by_day: buildDailySeries(viewDays, 30),
    contacts_by_day: buildDailySeries(contacts.map((row) => row.date_day), 30),
  });
}
