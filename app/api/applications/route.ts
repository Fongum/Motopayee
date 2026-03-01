import { NextResponse } from 'next/server';
import { requireBuyer } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

const createSchema = z.object({
  listing_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  // Verify listing exists and is published
  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('id, status')
    .eq('id', parsed.data.listing_id)
    .single();

  if (!listing || listing.status !== 'published') {
    return NextResponse.json({ error: 'Listing not available.' }, { status: 404 });
  }

  // Prevent duplicate application
  const { data: existing } = await supabaseAdmin
    .from('financing_applications')
    .select('id')
    .eq('listing_id', parsed.data.listing_id)
    .eq('buyer_id', auth.user.id)
    .not('status', 'eq', 'withdrawn')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'You already have an application for this listing.' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .insert({
      listing_id: parsed.data.listing_id,
      buyer_id: auth.user.id,
      status: 'draft',
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create application.' }, { status: 500 });
  }

  return NextResponse.json({ application: data }, { status: 201 });
}

export async function GET(request: Request) {
  const auth = await requireBuyer(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('financing_applications')
    .select('*, listing:listings(id, asking_price, zone, vehicle:vehicles(make, model, year))')
    .eq('buyer_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch applications.' }, { status: 500 });
  }

  return NextResponse.json({ applications: data ?? [] });
}
