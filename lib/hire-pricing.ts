/**
 * What a hire booking costs.
 *
 * Owners set a daily rate and, optionally, weekly and monthly rates. Those two
 * were collected from the owner, shown on the card, the detail page and the
 * comparison table — and never applied. Every booking was charged
 * `daily_rate × days`, so a renter comparing vehicles by monthly price was
 * comparing a number that could not be paid, and an owner who set one had no
 * way to know it did nothing.
 *
 * Longer bookings now take the best whole tier that fits: whole months at the
 * monthly rate, then whole weeks at the weekly rate, then the remainder daily.
 * A tier that is not set is skipped, so a listing with only a daily rate prices
 * exactly as it did before.
 */

/** A month is billed as 30 days. Calendar months would make an identical booking cost different amounts depending on when it started. */
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_WEEK = 7;

export interface HireRates {
  daily_rate: number;
  weekly_rate?: number | null;
  monthly_rate?: number | null;
}

export interface PriceLine {
  /** 'month' | 'week' | 'day' — the tier this line was billed at. */
  unit: 'month' | 'week' | 'day';
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface HirePrice {
  lines: PriceLine[];
  total: number;
}

/**
 * Break `days` into billed lines, largest tier first.
 *
 * A tier only applies when the owner set it *and* it beats charging that span
 * at the next tier down — an owner who enters a monthly rate higher than 30
 * daily rates has made a mistake, and the renter should not pay for it.
 */
export function priceHire(rates: HireRates, days: number): HirePrice {
  const lines: PriceLine[] = [];
  if (days <= 0) return { lines, total: 0 };

  const daily = Math.max(0, Math.round(rates.daily_rate));
  const weekly = rates.weekly_rate != null ? Math.round(rates.weekly_rate) : null;
  const monthly = rates.monthly_rate != null ? Math.round(rates.monthly_rate) : null;

  let remaining = days;

  if (monthly != null && monthly > 0 && monthly < daily * DAYS_PER_MONTH) {
    const months = Math.floor(remaining / DAYS_PER_MONTH);
    if (months > 0) {
      lines.push({ unit: 'month', quantity: months, unitPrice: monthly, amount: months * monthly });
      remaining -= months * DAYS_PER_MONTH;
    }
  }

  if (weekly != null && weekly > 0 && weekly < daily * DAYS_PER_WEEK) {
    const weeks = Math.floor(remaining / DAYS_PER_WEEK);
    if (weeks > 0) {
      lines.push({ unit: 'week', quantity: weeks, unitPrice: weekly, amount: weeks * weekly });
      remaining -= weeks * DAYS_PER_WEEK;
    }
  }

  if (remaining > 0) {
    lines.push({ unit: 'day', quantity: remaining, unitPrice: daily, amount: remaining * daily });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);

  // A tiered total must never exceed the flat daily price, or the "best rate"
  // promise is broken by a rounding boundary — 8 days at a weekly rate that
  // only just beats 7 daily, for instance.
  const flat = days * daily;
  if (total > flat) {
    return { lines: [{ unit: 'day', quantity: days, unitPrice: daily, amount: flat }], total: flat };
  }

  return { lines, total };
}

/**
 * The driver surcharge, which is always per day.
 *
 * There is no weekly or monthly driver rate in the schema, so this is not
 * tiered — it is kept separate so the vehicle lines stay readable.
 */
export function priceDriver(driverDailyRate: number | null | undefined, days: number): PriceLine | null {
  const rate = driverDailyRate != null ? Math.round(driverDailyRate) : 0;
  if (rate <= 0 || days <= 0) return null;
  return { unit: 'day', quantity: days, unitPrice: rate, amount: rate * days };
}

/** Total for a booking, vehicle plus driver. */
export function bookingTotal(
  rates: HireRates,
  days: number,
  driverDailyRate?: number | null
): { lines: PriceLine[]; driver: PriceLine | null; total: number } {
  const vehicle = priceHire(rates, days);
  const driver = priceDriver(driverDailyRate, days);
  return {
    lines: vehicle.lines,
    driver,
    total: vehicle.total + (driver?.amount ?? 0),
  };
}
