import { NextResponse } from 'next/server';
import { supabaseAdmin, getCurrentUser } from '@/lib/auth/server';

interface RouteParams { params: Promise<{ id: string }> }

/** Called client-side by ViewTracker on listing detail mount. Fire-and-forget. */
export async function POST(_req: Request, props: RouteParams) {
  const params = await props.params;
  const user = await getCurrentUser().catch(() => null);

  await supabaseAdmin.from('listing_views').insert({
    listing_id: params.id,
    viewer_id: user?.id ?? null,
    date_day: new Date().toISOString().split('T')[0],
  });

  return NextResponse.json({ ok: true });
}
