import { NextResponse } from 'next/server';
import { supabaseAdmin, getCurrentUser } from '@/lib/auth/server';

interface RouteParams { params: { id: string } }

/** Called client-side by ViewTracker on listing detail mount. Fire-and-forget. */
export async function POST(_req: Request, { params }: RouteParams) {
  const user = await getCurrentUser().catch(() => null);

  await supabaseAdmin.from('listing_views').insert({
    listing_id: params.id,
    viewer_id: user?.id ?? null,
    date_day: new Date().toISOString().split('T')[0],
  });

  return NextResponse.json({ ok: true });
}
