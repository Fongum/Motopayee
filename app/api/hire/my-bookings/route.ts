import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import type { HireBooking } from '@/lib/types';

// GET /api/hire/my-bookings — Get current user's bookings (as renter or owner)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const role = request.nextUrl.searchParams.get('role') ?? 'renter';

  const column = role === 'owner' ? 'owner_id' : 'renter_id';

  const { data, error } = await supabaseAdmin
    .from('hire_bookings')
    .select('*, hire_listing:hire_listings(id, make, model, year, city, daily_rate, media:hire_listing_media(id, storage_path, bucket, display_order)), renter:profiles!renter_id(full_name, phone, email), owner:profiles!owner_id(full_name, phone)')
    .eq(column, auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data as unknown as HireBooking[]);
}

// PATCH /api/hire/my-bookings — Update booking status (confirm, cancel, complete)
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { booking_id, action, reason } = body;

  if (!booking_id || !action) {
    return NextResponse.json({ error: 'booking_id and action are required' }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from('hire_bookings')
    .select('*')
    .eq('id', booking_id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const isOwner = booking.owner_id === auth.user.id;
  const isRenter = booking.renter_id === auth.user.id;

  if (!isOwner && !isRenter) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};

  switch (action) {
    case 'confirm':
      if (!isOwner || booking.status !== 'pending') {
        return NextResponse.json({ error: 'Only owner can confirm pending bookings' }, { status: 400 });
      }
      updates.status = 'confirmed';
      updates.confirmed_at = new Date().toISOString();
      break;

    case 'start':
      if (!isOwner || booking.status !== 'confirmed') {
        return NextResponse.json({ error: 'Only owner can start confirmed bookings' }, { status: 400 });
      }
      updates.status = 'active';
      // Mark listing as hired out
      await supabaseAdmin
        .from('hire_listings')
        .update({ availability: 'hired_out' })
        .eq('id', booking.hire_listing_id);
      break;

    case 'complete':
      if (!isOwner || booking.status !== 'active') {
        return NextResponse.json({ error: 'Only owner can complete active bookings' }, { status: 400 });
      }
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
      // Mark listing as available again
      await supabaseAdmin
        .from('hire_listings')
        .update({ availability: 'available' })
        .eq('id', booking.hire_listing_id);
      break;

    case 'cancel':
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return NextResponse.json({ error: 'Can only cancel pending or confirmed bookings' }, { status: 400 });
      }
      updates.status = 'cancelled';
      updates.cancelled_at = new Date().toISOString();
      updates.cancellation_reason = reason ?? null;
      break;

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (body.owner_notes && isOwner) updates.owner_notes = body.owner_notes;
  if (body.renter_notes && isRenter) updates.renter_notes = body.renter_notes;

  const { data, error } = await supabaseAdmin
    .from('hire_bookings')
    .update(updates)
    .eq('id', booking_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
