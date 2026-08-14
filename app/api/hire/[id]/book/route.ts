import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { parseBody, optionalText } from '@/lib/validation';

// Dates are calendar days (YYYY-MM-DD). They are parsed to real Date objects so
// an unparseable value is rejected here rather than silently producing NaN day
// counts further down.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ.')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Date invalide.');

const bookingSchema = z
  .object({
    start_date: isoDate,
    end_date: isoDate,
    hire_type: z.enum(['self_drive', 'with_driver']).default('self_drive'),
    pickup_location: optionalText(200),
    dropoff_location: optionalText(200),
    renter_notes: optionalText(1000),
  })
  .refine((v) => Date.parse(v.end_date) > Date.parse(v.start_date), {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['end_date'],
  });

// POST /api/hire/[id]/book — Create a booking for a hire listing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Get the listing
  const { data: listing } = await supabaseAdmin
    .from('hire_listings')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'published')
    .eq('availability', 'available')
    .single();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not available' }, { status: 404 });
  }

  // Cannot book own listing
  if (listing.owner_id === auth.user.id) {
    return NextResponse.json({ error: 'Cannot book your own listing' }, { status: 400 });
  }

  const parsed = await parseBody(bookingSchema, request, 'Réservation invalide.');
  if (!parsed.success) return parsed.response;

  const { start_date, end_date, pickup_location, dropoff_location, renter_notes } = parsed.data;

  // Calculate days. The schema guarantees both dates parse and that end > start,
  // so totalDays is always a positive integer here.
  const diffMs = Date.parse(end_date) - Date.parse(start_date);
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays < listing.min_hire_days) {
    return NextResponse.json({ error: `Minimum hire period is ${listing.min_hire_days} days` }, { status: 400 });
  }

  if (listing.max_hire_days && totalDays > listing.max_hire_days) {
    return NextResponse.json({ error: `Maximum hire period is ${listing.max_hire_days} days` }, { status: 400 });
  }

  // Check for overlapping bookings
  const { data: conflicts } = await supabaseAdmin
    .from('hire_bookings')
    .select('id')
    .eq('hire_listing_id', params.id)
    .in('status', ['pending', 'confirmed', 'active'])
    .lte('start_date', end_date)
    .gte('end_date', start_date);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'Dates conflict with an existing booking' }, { status: 409 });
  }

  // Validate hire type against what the listing actually offers
  const selectedHireType = parsed.data.hire_type;
  if (selectedHireType === 'with_driver' && listing.hire_type === 'self_drive') {
    return NextResponse.json({ error: 'This listing does not offer driver service' }, { status: 400 });
  }
  if (selectedHireType === 'self_drive' && listing.hire_type === 'with_driver') {
    return NextResponse.json({ error: 'This listing requires a driver' }, { status: 400 });
  }

  // Calculate total
  let totalAmount = listing.daily_rate * totalDays;
  const driverRate = selectedHireType === 'with_driver' ? (listing.driver_daily_rate ?? 0) : 0;
  totalAmount += driverRate * totalDays;

  const { data: booking, error } = await supabaseAdmin
    .from('hire_bookings')
    .insert({
      hire_listing_id: params.id,
      renter_id: auth.user.id,
      owner_id: listing.owner_id,
      start_date,
      end_date,
      total_days: totalDays,
      hire_type: selectedHireType,
      daily_rate: listing.daily_rate,
      driver_daily_rate: driverRate || null,
      deposit_amount: listing.deposit_amount,
      total_amount: totalAmount,
      pickup_location: pickup_location ?? listing.address ?? listing.city,
      dropoff_location: dropoff_location ?? pickup_location ?? listing.address ?? listing.city,
      renter_notes: renter_notes ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(booking, { status: 201 });
}
