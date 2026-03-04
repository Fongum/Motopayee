import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams { params: { id: string } }

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

  const ago7d  = new Date(Date.now() - 7  * 86_400_000).toISOString().split('T')[0];
  const ago30d = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0];

  const [totalRes, week7Res, byDayRes, favRes] = await Promise.all([
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
  ]);

  // Aggregate by_day
  const dayMap: Record<string, number> = {};
  ((byDayRes.data ?? []) as { date_day: string }[]).forEach((row) => {
    dayMap[row.date_day] = (dayMap[row.date_day] ?? 0) + 1;
  });

  // Build last 30 days (every day, fill 0 for missing)
  const by_day = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000);
    const key = d.toISOString().split('T')[0];
    return { date: key, count: dayMap[key] ?? 0 };
  });

  return NextResponse.json({
    total_views: totalRes.count ?? 0,
    views_7d: week7Res.count ?? 0,
    favourites_count: favRes.count ?? 0,
    by_day,
  });
}
