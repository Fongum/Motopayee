import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';
import { isQueryFailure } from '@/lib/query-result';
import { reportError } from '@/lib/error-reporting';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: Request, props: RouteParams) {
  const params = await props.params;
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // See lib/documents: the polymorphic table cannot be embedded, and the
  // embed's PGRST200 was being reported to the caller as "Listing not found".
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(*)')
    .eq('id', params.id)
    .eq('seller_id', auth.user.id)
    .single();

  // A missing row is a 404; anything else is a failure and must not be one.
  if (isQueryFailure(error)) {
    reportError(error, { source: 'api', route: '/api/seller/listings/[id]' });
    return NextResponse.json({ error: 'Failed to load.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }


  return NextResponse.json({ listing: data });
}

const patchSchema = z.object({
  asking_price: z.number().min(0).optional(),
  city: z.string().optional(),
  description: z.string().optional(),
});

export async function PATCH(request: Request, props: RouteParams) {
  const params = await props.params;
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Verify ownership and draft status
  const { data: existing } = await supabaseAdmin
    .from('listings')
    .select('id, seller_id, status')
    .eq('id', params.id)
    .single();

  if (!existing || existing.seller_id !== auth.user.id) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Can only update draft listings.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.asking_price !== undefined) updates.asking_price = parsed.data.asking_price;
  if (parsed.data.city !== undefined) updates.city = parsed.data.city;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;

  const { data, error } = await supabaseAdmin
    .from('listings')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update listing.' }, { status: 500 });
  }

  return NextResponse.json({ listing: data });
}
