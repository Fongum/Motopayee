import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { isQueryFailure } from '@/lib/query-result';
import { reportError } from '@/lib/error-reporting';

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { data, error } = await supabaseAdmin
    .from('listings')
    // Unauthenticated, so named public columns only. `*` here handed anyone
    // who knew a listing id MotoPayee's internal valuation (mve_low/high,
    // suggested_price), the price_band withdrawn from public display, the
    // staff assignments, and from the vehicle its VIN and inspection notes.
    .select(
      `
      id, status, asking_price, previous_price, zone, city, description,
      financeable, published_at, created_at,
      vehicle:vehicles(make, model, year, mileage_km, fuel_type, transmission, color, engine_cc, seats, condition_grade),
      media:media_assets(id, storage_path, bucket, display_order, asset_type, caption)
      `
    )
    .eq('id', params.id)
    .eq('status', 'published')
    .single();

  // A missing row is a 404; anything else is a failure and must not be one.
  if (isQueryFailure(error)) {
    reportError(error, { source: 'api', route: '/api/listings/[id]' });
    return NextResponse.json({ error: 'Failed to load.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  return NextResponse.json({ listing: data });
}
