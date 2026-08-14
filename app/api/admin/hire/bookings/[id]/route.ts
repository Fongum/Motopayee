import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/auth/server';
import { ensureHireServiceFee } from '@/lib/hire-service-fees';
import { z } from 'zod';

interface RouteParams { params: { id: string } }

const schema = z.object({
  action: z.enum(['confirm', 'start', 'complete', 'cancel', 'dispute', 'mark_deposit_paid', 'mark_fully_paid', 'refund']),
  reason: z.string().optional(),
  owner_notes: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireStaff(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid booking action.' }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from('hire_bookings')
    .select('id, status, payment_status, hire_listing_id')
    .eq('id', params.id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  const listingUpdates: Record<string, unknown> = {};
  const now = new Date().toISOString();

  switch (parsed.data.action) {
    case 'confirm':
      if (booking.status !== 'pending') {
        return NextResponse.json({ error: 'Only pending bookings can be confirmed.' }, { status: 400 });
      }
      updates.status = 'confirmed';
      updates.confirmed_at = now;
      break;
    case 'start':
      if (booking.status !== 'confirmed') {
        return NextResponse.json({ error: 'Only confirmed bookings can be started.' }, { status: 400 });
      }
      updates.status = 'active';
      listingUpdates.availability = 'hired_out';
      break;
    case 'complete':
      if (booking.status !== 'active') {
        return NextResponse.json({ error: 'Only active bookings can be completed.' }, { status: 400 });
      }
      updates.status = 'completed';
      updates.completed_at = now;
      listingUpdates.availability = 'available';
      break;
    case 'cancel':
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return NextResponse.json({ error: 'Only pending or confirmed bookings can be cancelled.' }, { status: 400 });
      }
      updates.status = 'cancelled';
      updates.cancelled_at = now;
      updates.cancellation_reason = parsed.data.reason ?? 'Cancelled by MotoPayee staff';
      break;
    case 'dispute':
      if (!['confirmed', 'active', 'completed'].includes(booking.status)) {
        return NextResponse.json({ error: 'Only confirmed, active, or completed bookings can be disputed.' }, { status: 400 });
      }
      updates.status = 'disputed';
      updates.owner_notes = parsed.data.owner_notes ?? 'Marked as disputed by MotoPayee staff';
      break;
    case 'mark_deposit_paid':
      updates.payment_status = 'deposit_paid';
      break;
    case 'mark_fully_paid':
      updates.payment_status = 'fully_paid';
      break;
    case 'refund':
      updates.payment_status = 'refunded';
      break;
  }

  if (parsed.data.owner_notes && parsed.data.action !== 'dispute') {
    updates.owner_notes = parsed.data.owner_notes;
  }

  const { data, error } = await supabaseAdmin
    .from('hire_bookings')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update booking.' }, { status: 500 });
  }

  if (Object.keys(listingUpdates).length > 0) {
    await supabaseAdmin
      .from('hire_listings')
      .update(listingUpdates)
      .eq('id', booking.hire_listing_id);
  }

  await supabaseAdmin.from('audit_logs').insert({
    actor_id: auth.user.id,
    actor_email: auth.user.email,
    actor_role: auth.user.role,
    action: 'hire_booking_staff_action',
    entity_type: 'hire_booking',
    entity_id: params.id,
    meta: {
      action: parsed.data.action,
      previous_status: booking.status,
      previous_payment_status: booking.payment_status,
    },
  });

  if (parsed.data.action === 'mark_deposit_paid') {
    await ensureHireServiceFee(params.id, auth.user.id, 'expected');
  }

  if (parsed.data.action === 'mark_fully_paid') {
    await ensureHireServiceFee(params.id, auth.user.id, 'paid');
  }

  return NextResponse.json(data);
}
