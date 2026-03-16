import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/price-alerts
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from('price_alerts')
    .select('*, listing:listings(asking_price, vehicle:vehicles(make, model, year))')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/price-alerts
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { listing_id, threshold_price } = body;

  if (!listing_id || !threshold_price) {
    return NextResponse.json({ error: 'listing_id and threshold_price required.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('price_alerts')
    .insert({
      user_id: auth.user.id,
      listing_id,
      threshold_price,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Alerte déjà configurée.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
