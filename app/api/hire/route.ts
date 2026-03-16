import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth, requireSeller } from '@/lib/auth/middleware';
import type { HireListing } from '@/lib/types';

// GET /api/hire — Browse published hire listings (public)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let q = supabaseAdmin
    .from('hire_listings')
    .select('*, owner:profiles!owner_id(full_name, is_verified, phone), media:hire_listing_media(*)', { count: 'exact' })
    .eq('status', 'published');

  // Filters
  const city = searchParams.get('city');
  const zone = searchParams.get('zone');
  const make = searchParams.get('make');
  const hireType = searchParams.get('hire_type');
  const minPrice = searchParams.get('min_price');
  const maxPrice = searchParams.get('max_price');
  const fuelType = searchParams.get('fuel_type');
  const transmission = searchParams.get('transmission');
  const seats = searchParams.get('min_seats');
  const available = searchParams.get('available');

  if (city)         q = q.ilike('city', `%${city}%`);
  if (zone)         q = q.eq('zone', zone);
  if (make)         q = q.ilike('make', `%${make}%`);
  if (hireType)     q = q.in('hire_type', [hireType, 'both']);
  if (minPrice)     q = q.gte('daily_rate', parseInt(minPrice));
  if (maxPrice)     q = q.lte('daily_rate', parseInt(maxPrice));
  if (fuelType)     q = q.eq('fuel_type', fuelType);
  if (transmission) q = q.eq('transmission', transmission);
  if (seats)        q = q.gte('seats', parseInt(seats));
  if (available === 'true') q = q.eq('availability', 'available');

  // Sort
  const sort = searchParams.get('sort');
  switch (sort) {
    case 'price_asc':  q = q.order('daily_rate', { ascending: true }); break;
    case 'price_desc': q = q.order('daily_rate', { ascending: false }); break;
    default:           q = q.order('created_at', { ascending: false }); break;
  }

  const { data, count, error } = await q.range(offset, offset + pageSize - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ listings: data as unknown as HireListing[], total: count ?? 0 });
}

// POST /api/hire — Create a hire listing (sellers only)
export async function POST(request: NextRequest) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    // Also allow buyers to list for hire
    const authAny = await requireAuth(request);
    if (!authAny.authenticated) {
      return NextResponse.json({ error: authAny.error }, { status: authAny.status });
    }
    // Any authenticated user can create a hire listing
    const user = authAny.user;
    const body = await request.json();
    return createHireListing(user.id, body);
  }

  const body = await request.json();
  return createHireListing(auth.user.id, body);
}

async function createHireListing(ownerId: string, body: Record<string, unknown>) {
  const required = ['make', 'model', 'year', 'daily_rate', 'city'];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('hire_listings')
    .insert({
      owner_id: ownerId,
      dealer_id: body.dealer_id ?? null,
      make: body.make,
      model: body.model,
      year: body.year,
      fuel_type: body.fuel_type ?? 'petrol',
      transmission: body.transmission ?? 'automatic',
      color: body.color ?? null,
      seats: body.seats ?? 5,
      engine_cc: body.engine_cc ?? null,
      plate_number: body.plate_number ?? null,
      hire_type: body.hire_type ?? 'self_drive',
      daily_rate: body.daily_rate,
      weekly_rate: body.weekly_rate ?? null,
      monthly_rate: body.monthly_rate ?? null,
      deposit_amount: body.deposit_amount ?? 0,
      driver_daily_rate: body.driver_daily_rate ?? null,
      mileage_limit_per_day_km: body.mileage_limit_per_day_km ?? null,
      extra_km_charge: body.extra_km_charge ?? null,
      min_hire_days: body.min_hire_days ?? 1,
      max_hire_days: body.max_hire_days ?? null,
      city: body.city,
      zone: body.zone ?? 'A',
      address: body.address ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      description: body.description ?? null,
      conditions: body.conditions ?? null,
      features: body.features ?? [],
      insurance_included: body.insurance_included ?? false,
      status: 'pending_review',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
