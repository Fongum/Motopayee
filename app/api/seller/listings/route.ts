import { NextResponse } from 'next/server';
import { requireSeller } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { z } from 'zod';

const schema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1960).max(new Date().getFullYear() + 1),
  mileage_km: z.number().int().min(0),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'other']).default('petrol'),
  transmission: z.enum(['manual', 'automatic', 'other']).default('manual'),
  color: z.string().optional(),
  engine_cc: z.number().int().optional().nullable(),
  seats: z.number().int().optional().nullable(),
  asking_price: z.number().min(0),
  zone: z.enum(['A', 'B', 'C']),
  city: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireSeller(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const { make, model, year, mileage_km, fuel_type, transmission, color, engine_cc, seats,
          asking_price, zone, city, description } = parsed.data;

  // Create vehicle record
  const { data: vehicle, error: vehicleError } = await supabaseAdmin
    .from('vehicles')
    .insert({ make, model, year, mileage_km, fuel_type, transmission, color, engine_cc, seats })
    .select()
    .single();

  if (vehicleError || !vehicle) {
    return NextResponse.json({ error: 'Failed to create vehicle record.' }, { status: 500 });
  }

  // Create listing
  const { data: listing, error: listingError } = await supabaseAdmin
    .from('listings')
    .insert({
      vehicle_id: vehicle.id,
      seller_id: auth.user.id,
      asking_price,
      zone,
      city,
      description,
      status: 'draft',
    })
    .select('*, vehicle:vehicles(*)')
    .single();

  if (listingError || !listing) {
    // Rollback vehicle
    await supabaseAdmin.from('vehicles').delete().eq('id', vehicle.id);
    return NextResponse.json({ error: 'Failed to create listing.' }, { status: 500 });
  }

  return NextResponse.json({ listing }, { status: 201 });
}
