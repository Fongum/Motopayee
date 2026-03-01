import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zone = searchParams.get('zone');
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));

  let query = supabaseAdmin
    .from('listings')
    .select(
      `
      *,
      vehicle:vehicles(*),
      media:media_assets(id, storage_path, bucket, display_order, asset_type)
      `,
      { count: 'exact' }
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (zone) query = query.eq('zone', zone);
  if (minPrice) query = query.gte('asking_price', parseFloat(minPrice));
  if (maxPrice) query = query.lte('asking_price', parseFloat(maxPrice));

  if (make || model) {
    // Filter via vehicle join — need to get matching vehicle IDs first
    let vehicleQuery = supabaseAdmin.from('vehicles').select('id');
    if (make) vehicleQuery = vehicleQuery.ilike('make', `%${make}%`);
    if (model) vehicleQuery = vehicleQuery.ilike('model', `%${model}%`);

    const { data: vehicles } = await vehicleQuery;
    const vehicleIds = (vehicles ?? []).map((v: { id: string }) => v.id);

    if (vehicleIds.length === 0) {
      return NextResponse.json({ listings: [], total: 0 });
    }

    query = query.in('vehicle_id', vehicleIds);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch listings.' }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [], total: count ?? 0 });
}
