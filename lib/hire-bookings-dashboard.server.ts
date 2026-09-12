/**
 * Server-side fetchers for the rental booking dashboard.
 *
 * Split from `hire-bookings-dashboard.ts` so the shapes and helpers stay
 * importable without constructing a Supabase client.
 */

import { supabaseAdmin } from './auth/server';
import { reportError } from './error-reporting';
import { EMPTY_BOOKING_TOTALS } from './hire-bookings-dashboard';
import type { BookingTotals, FeeTotals } from './hire-bookings-dashboard';

/** Empty totals on failure: a stat tile must not take the bookings table down. */

export async function fetchFeeTotals(): Promise<FeeTotals> {
  const { data, error } = await supabaseAdmin.rpc('hire_service_fee_totals');

  if (error) {
    reportError(error, { source: 'admin/hire/bookings', context: 'hire_service_fee_totals' });
    return {};
  }
  return (data as FeeTotals | null) ?? {};
}

export async function fetchBookingTotals(): Promise<BookingTotals> {
  const { data, error } = await supabaseAdmin.rpc('hire_booking_totals');

  if (error) {
    reportError(error, { source: 'admin/hire/bookings', context: 'hire_booking_totals' });
    return EMPTY_BOOKING_TOTALS;
  }
  return { ...EMPTY_BOOKING_TOTALS, ...(data as BookingTotals | null) };
}
