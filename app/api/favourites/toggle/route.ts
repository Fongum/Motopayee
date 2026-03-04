import { NextResponse } from 'next/server';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { listing_id } = await request.json().catch(() => ({}));
  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id required.' }, { status: 400 });
  }

  // Check if already saved
  const { data: existing } = await supabaseAdmin
    .from('favourites')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('listing_id', listing_id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from('favourites').delete().eq('id', existing.id);
    return NextResponse.json({ saved: false });
  }

  await supabaseAdmin.from('favourites').insert({
    user_id: auth.user.id,
    listing_id,
  });
  return NextResponse.json({ saved: true });
}
