import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';

interface RouteParams { params: { id: string } }

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', params.id)
    .single();

  if (!listing || listing.seller_id !== auth.user.id) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  if (listing.status !== 'draft') {
    return NextResponse.json({ error: 'Listing already submitted.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('listings')
    .update({ status: 'ownership_submitted' })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to submit listing.' }, { status: 500 });
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'listing_ownership_submitted',
    entity_type: 'listings',
    entity_id: params.id,
    meta: { from: 'draft', to: 'ownership_submitted' },
  });

  return NextResponse.json({ listing: data });
}
