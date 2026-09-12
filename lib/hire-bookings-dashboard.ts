/**
 * Rental booking reconciliation dashboard figures.
 *
 * Sibling of `finance-dashboard.ts`, for the same reasons: the admin bookings
 * page reduced service-fee revenue and booking value in JavaScript over
 * unbounded selects, which PostgREST truncates at db-max-rows. Migration 038
 * moved the arithmetic into Postgres.
 *
 * Pure shapes and helpers only; fetchers live in the `.server` sibling.
 */

import { statusAmount, statusAmountOf, statusCount, statusCountOf } from './status-totals';
import type { StatusTotals } from './status-totals';

// ─── Vocabulary ───────────────────────────────────────────────────────────────

/** Mirrors the hire_service_fees status CHECK (migration 022). */
export const FEE_STATUSES = ['expected', 'invoiced', 'paid', 'waived', 'refunded'] as const;
export type FeeStatus = (typeof FEE_STATUSES)[number];

export function isFeeStatus(value: string | undefined | null): value is FeeStatus {
  return typeof value === 'string' && (FEE_STATUSES as readonly string[]).includes(value);
}

/** Mirrors the hire_bookings status CHECK (migration 010). */
export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'disputed',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ['unpaid', 'deposit_paid', 'fully_paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Bookings that represent money still in play — awaiting confirmation, agreed,
 * or under way. "Valeur active" is the sum across these three.
 */
export const LIVE_BOOKING_STATUSES: readonly BookingStatus[] = ['pending', 'confirmed', 'active'];

/** Bookings already agreed or under way, as opposed to merely requested. */
export const IN_PROGRESS_BOOKING_STATUSES: readonly BookingStatus[] = ['confirmed', 'active'];

// ─── Shapes ───────────────────────────────────────────────────────────────────

export type FeeTotals = StatusTotals<FeeStatus>;

export interface BookingTotals {
  by_status: StatusTotals<BookingStatus>;
  by_payment_status: StatusTotals<PaymentStatus>;
}

export const EMPTY_BOOKING_TOTALS: BookingTotals = {
  by_status: {},
  by_payment_status: {},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function feeCount(totals: FeeTotals, status: FeeStatus): number {
  return statusCount(totals, status);
}

export function feeAmount(totals: FeeTotals, status: FeeStatus): number {
  return statusAmount(totals, status);
}

export function bookingCount(totals: BookingTotals, status: BookingStatus): number {
  return statusCount(totals.by_status, status);
}

/** How many bookings are agreed or under way. */
export function inProgressBookingCount(totals: BookingTotals): number {
  return statusCountOf(totals.by_status, IN_PROGRESS_BOOKING_STATUSES);
}

/** Total value of every booking still in play. */
export function liveBookingValue(totals: BookingTotals): number {
  return statusAmountOf(totals.by_status, LIVE_BOOKING_STATUSES);
}

/** Total value of bookings the renter has paid in full. */
export function fullyPaidValue(totals: BookingTotals): number {
  return statusAmount(totals.by_payment_status, 'fully_paid');
}

/**
 * Select string for the bookings table.
 *
 * The service fee is embedded rather than re-fetched by booking id, and becomes
 * `!inner` when the page filters on fee status — replacing a pre-query that
 * resolved booking ids into an unbounded `.in()` list, which PostgREST silently
 * truncated at a thousand.
 */
export function bookingListSelect(filterByFee: boolean): string {
  const feeJoin = filterByFee ? 'hire_service_fees!inner' : 'hire_service_fees';
  return `
    *,
    hire_listing:hire_listings(id, make, model, year, city, plate_number),
    renter:profiles!renter_id(full_name, email, phone),
    owner:profiles!owner_id(full_name, email, phone),
    fee:${feeJoin}(id, hire_booking_id, fee_rate_percent, fee_amount_xaf, status, paid_at)
  `;
}
