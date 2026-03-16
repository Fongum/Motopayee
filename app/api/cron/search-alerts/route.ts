import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { matchListings, matchHireListings } from '@/lib/search-matcher';

// POST /api/cron/search-alerts — daily cron: check saved searches for new matches
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: searches } = await supabaseAdmin
    .from('saved_searches')
    .select('*, user:profiles!user_id(phone, email)')
    .eq('active', true)
    .neq('notify_via', 'none');

  if (!searches || searches.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let notified = 0;

  for (const search of searches) {
    const filters = search.filters as Record<string, string>;
    const result = search.search_type === 'hire'
      ? await matchHireListings(filters, 5)
      : await matchListings(filters, 5);

    const newCount = result.count;

    // Only notify if new matches appeared since last check
    if (newCount > search.last_match_count) {
      const user = search.user as unknown as { phone: string | null; email: string };

      if (search.notify_via === 'whatsapp' && user.phone) {
        const msg = `MotoPayee: ${newCount - search.last_match_count} nouveau(x) résultat(s) pour "${search.label}". Voir: ${process.env.NEXT_PUBLIC_APP_URL}/${search.search_type === 'hire' ? 'hire' : 'listings'}`;
        // In production, send via WhatsApp Business API
        // For now, log the notification
        console.log(`[search-alert] WhatsApp → ${user.phone}: ${msg}`);
      }

      if (search.notify_via === 'sms' && user.phone) {
        console.log(`[search-alert] SMS → ${user.phone}: ${newCount - search.last_match_count} new matches for "${search.label}"`);
      }

      notified++;
    }

    // Update match count
    await supabaseAdmin
      .from('saved_searches')
      .update({ last_match_count: newCount, last_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', search.id);
  }

  return NextResponse.json({ processed: searches.length, notified });
}
