import { supabaseAdmin } from '@/lib/auth/server';
import { logger } from '@/lib/logger';

const DEFAULT_HIRE_SERVICE_FEE_RATE_PERCENT = 10;

type HireBookingFeeRow = {
  id: string;
  hire_listing_id: string;
  renter_id: string;
  owner_id: string;
  total_amount: number;
};

export function calculateHireServiceFee(bookingValueXaf: number, ratePercent = DEFAULT_HIRE_SERVICE_FEE_RATE_PERCENT) {
  return Math.round((bookingValueXaf * ratePercent) / 100);
}

export async function ensureHireServiceFee(
  bookingId: string,
  actorId: string | null,
  status: 'expected' | 'paid' = 'expected'
) {
  const { data: booking } = await supabaseAdmin
    .from('hire_bookings')
    .select('id, hire_listing_id, renter_id, owner_id, total_amount')
    .eq('id', bookingId)
    .single();

  if (!booking) return null;

  const row = booking as HireBookingFeeRow;
  const bookingValue = Number(row.total_amount ?? 0);
  const feeAmount = calculateHireServiceFee(bookingValue);
  const paidAt = status === 'paid' ? new Date().toISOString() : null;

  const { data: existing } = await supabaseAdmin
    .from('hire_service_fees')
    .select('id, status')
    .eq('hire_booking_id', row.id)
    .maybeSingle();

  if (existing) {
    if (status === 'paid' && existing.status !== 'paid') {
      const { data, error } = await supabaseAdmin
        .from('hire_service_fees')
        .update({ status: 'paid', paid_at: paidAt })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update hire service fee', { err: error });
        return null;
      }

      return data;
    }

    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from('hire_service_fees')
    .insert({
      hire_booking_id: row.id,
      hire_listing_id: row.hire_listing_id,
      renter_id: row.renter_id,
      owner_id: row.owner_id,
      booking_value_xaf: bookingValue,
      fee_rate_percent: DEFAULT_HIRE_SERVICE_FEE_RATE_PERCENT,
      fee_amount_xaf: feeAmount,
      status,
      paid_at: paidAt,
      created_by: actorId,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to ensure hire service fee', { err: error });
    return null;
  }

  return data;
}
