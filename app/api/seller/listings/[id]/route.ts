import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('*, vehicle:vehicles(*), documents(*)')
    .eq('id', params.id)
    .eq('seller_id', auth.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  return NextResponse.json({ listing: data });
}

const patchSchema = z.object({
  asking_price: z.number().min(0).optional(),
  city: z.string().optional(),
  description: z.string().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
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
