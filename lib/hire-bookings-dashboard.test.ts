import { describe, it, expect } from 'vitest';
import {
  BOOKING_STATUSES,
  EMPTY_BOOKING_TOTALS,
  FEE_STATUSES,
  PAYMENT_STATUSES,
  bookingCount,
  bookingListSelect,
  feeAmount,
  feeCount,
  fullyPaidValue,
  inProgressBookingCount,
  isFeeStatus,
  liveBookingValue,
} from './hire-bookings-dashboard';
import type { BookingTotals } from './hire-bookings-dashboard';

describe('status vocabularies', () => {
  it('mirrors the hire_service_fees status CHECK, including refunded', () => {
    // Migration 022 allows five, one more than the sales-side commissions.
    expect([...FEE_STATUSES]).toEqual(['expected', 'invoiced', 'paid', 'waived', 'refunded']);
  });

  it('mirrors the hire_bookings status CHECK', () => {
    expect([...BOOKING_STATUSES]).toEqual([
      'pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed',
    ]);
  });

  it('mirrors the payment_status CHECK', () => {
    expect([...PAYMENT_STATUSES]).toEqual(['unpaid', 'deposit_paid', 'fully_paid', 'refunded']);
  });

  it('accepts only real fee statuses', () => {
    expect(isFeeStatus('refunded')).toBe(true);
    expect(isFeeStatus('settled')).toBe(false);
    expect(isFeeStatus(undefined)).toBe(false);
  });
});

describe('fee totals', () => {
  const fees = {
    expected: { count: 3, amount: '150000.00' },
    paid: { count: 5, amount: '400000.25' },
  };

  it('reads count and amount for a present status', () => {
    expect(feeCount(fees, 'expected')).toBe(3);
    expect(feeAmount(fees, 'paid')).toBe(400_000.25);
  });

  it('reports zero for a status nobody has used', () => {
    expect(feeCount(fees, 'waived')).toBe(0);
    expect(feeAmount(fees, 'refunded')).toBe(0);
  });

  it('reports zero when the fetch failed entirely', () => {
    expect(feeCount({}, 'paid')).toBe(0);
    expect(feeAmount({}, 'paid')).toBe(0);
  });
});

describe('booking totals', () => {
  const totals: BookingTotals = {
    by_status: {
      pending: { count: 2, amount: '100000' },
      confirmed: { count: 3, amount: '300000' },
      active: { count: 1, amount: '50000' },
      completed: { count: 9, amount: '900000' },
      cancelled: { count: 4, amount: '400000' },
    },
    by_payment_status: {
      fully_paid: { count: 6, amount: '620000' },
      unpaid: { count: 3, amount: '150000' },
    },
  };

  it('counts a single lifecycle status', () => {
    expect(bookingCount(totals, 'pending')).toBe(2);
  });

  it('counts confirmed and active together as in-progress', () => {
    expect(inProgressBookingCount(totals)).toBe(4);
  });

  it('sums value across every booking still in play', () => {
    // pending + confirmed + active — completed and cancelled are not live money.
    expect(liveBookingValue(totals)).toBe(450_000);
  });

  it('excludes completed and cancelled bookings from the live value', () => {
    expect(liveBookingValue(totals)).not.toBe(1_750_000);
  });

  it('reads the fully-paid value off the payment-status rollup', () => {
    // A separate grouping: payment status is orthogonal to lifecycle status.
    expect(fullyPaidValue(totals)).toBe(620_000);
  });

  it('reports zero across the board when the fetch failed', () => {
    expect(bookingCount(EMPTY_BOOKING_TOTALS, 'pending')).toBe(0);
    expect(liveBookingValue(EMPTY_BOOKING_TOTALS)).toBe(0);
    expect(fullyPaidValue(EMPTY_BOOKING_TOTALS)).toBe(0);
    expect(inProgressBookingCount(EMPTY_BOOKING_TOTALS)).toBe(0);
  });
});

describe('bookingListSelect', () => {
  it('embeds the service fee so no second query is needed', () => {
    expect(bookingListSelect(false)).toContain('fee:hire_service_fees(');
  });

  it('makes the embed inner when filtering on fee status', () => {
    expect(bookingListSelect(true)).toContain('hire_service_fees!inner');
  });

  it('leaves it outer otherwise, so bookings without a fee still list', () => {
    expect(bookingListSelect(false)).not.toContain('!inner');
  });

  it('keeps the joins the table renders', () => {
    const select = bookingListSelect(false);
    expect(select).toContain('hire_listing:hire_listings');
    expect(select).toContain('renter:profiles!renter_id');
    expect(select).toContain('owner:profiles!owner_id');
  });
});
