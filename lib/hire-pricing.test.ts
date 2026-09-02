import { describe, it, expect } from 'vitest';
import { DAYS_PER_MONTH, DAYS_PER_WEEK, bookingTotal, priceDriver, priceHire } from './hire-pricing';

const RATES = { daily_rate: 25_000, weekly_rate: 150_000, monthly_rate: 500_000 };

describe('priceHire', () => {
  it('charges short bookings by the day', () => {
    const { lines, total } = priceHire(RATES, 3);
    expect(total).toBe(75_000);
    expect(lines).toEqual([{ unit: 'day', quantity: 3, unitPrice: 25_000, amount: 75_000 }]);
  });

  it('uses the weekly rate once a whole week fits', () => {
    // 7 daily would be 175,000; the weekly rate is 150,000.
    expect(priceHire(RATES, 7).total).toBe(150_000);
  });

  it('bills whole weeks then the remaining days', () => {
    const { total } = priceHire(RATES, 9);
    expect(total).toBe(150_000 + 2 * 25_000);
  });

  it('uses the monthly rate once a whole month fits', () => {
    expect(priceHire(RATES, DAYS_PER_MONTH).total).toBe(500_000);
  });

  it('stacks months, then weeks, then days', () => {
    // 38 days = 1 month (30) + 1 week (7) + 1 day.
    const { lines, total } = priceHire(RATES, 38);
    expect(lines.map((l) => l.unit)).toEqual(['month', 'week', 'day']);
    expect(total).toBe(500_000 + 150_000 + 25_000);
  });

  it('is cheaper than flat daily for a long booking — the point of the change', () => {
    const days = 30;
    expect(priceHire(RATES, days).total).toBeLessThan(days * RATES.daily_rate);
  });

  it('prices exactly as before when only a daily rate is set', () => {
    // The overwhelming majority of listings. This must not change.
    const dailyOnly = { daily_rate: 25_000, weekly_rate: null, monthly_rate: null };
    for (const days of [1, 6, 7, 29, 30, 45]) {
      expect(priceHire(dailyOnly, days).total).toBe(days * 25_000);
    }
  });

  it('ignores a tier that is more expensive than the one below it', () => {
    // An owner who types a weekly rate above seven daily rates has made a
    // mistake; the renter should not pay for it.
    const bad = { daily_rate: 10_000, weekly_rate: 999_000, monthly_rate: null };
    expect(priceHire(bad, 7).total).toBe(70_000);
  });

  it('never charges more than the flat daily price', () => {
    // The guarantee that makes "best rate" true at every boundary.
    const cases = [
      { daily_rate: 10_000, weekly_rate: 69_000, monthly_rate: null },
      { daily_rate: 10_000, weekly_rate: 69_000, monthly_rate: 299_000 },
      { daily_rate: 1, weekly_rate: 6, monthly_rate: 29 },
    ];
    for (const rates of cases) {
      for (let days = 1; days <= 70; days += 1) {
        expect(priceHire(rates, days).total).toBeLessThanOrEqual(days * rates.daily_rate);
      }
    }
  });

  it('produces whole XAF, which has no subunit', () => {
    const rates = { daily_rate: 3_333, weekly_rate: 20_000, monthly_rate: 79_999 };
    for (let days = 1; days <= 40; days += 1) {
      expect(Number.isInteger(priceHire(rates, days).total)).toBe(true);
    }
  });

  it('returns nothing for a zero or negative span', () => {
    expect(priceHire(RATES, 0)).toEqual({ lines: [], total: 0 });
    expect(priceHire(RATES, -3)).toEqual({ lines: [], total: 0 });
  });

  it('keeps the line breakdown consistent with the total', () => {
    for (const days of [1, 7, 8, 30, 31, 37, 60, 67]) {
      const { lines, total } = priceHire(RATES, days);
      expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(total);
      expect(lines.reduce((s, l) => s + l.quantity * (l.unit === 'month' ? DAYS_PER_MONTH : l.unit === 'week' ? DAYS_PER_WEEK : 1), 0))
        .toBe(days);
    }
  });
});

describe('priceDriver', () => {
  it('charges the driver per day, untiered', () => {
    // There is no weekly or monthly driver rate in the schema.
    expect(priceDriver(5_000, 30)).toEqual({ unit: 'day', quantity: 30, unitPrice: 5_000, amount: 150_000 });
  });

  it('is absent when no driver rate is set', () => {
    expect(priceDriver(null, 5)).toBeNull();
    expect(priceDriver(0, 5)).toBeNull();
    expect(priceDriver(5_000, 0)).toBeNull();
  });
});

describe('bookingTotal', () => {
  it('adds the driver surcharge to the tiered vehicle price', () => {
    const { total } = bookingTotal(RATES, 30, 5_000);
    expect(total).toBe(500_000 + 30 * 5_000);
  });

  it('matches the vehicle price when self-drive', () => {
    expect(bookingTotal(RATES, 30, null).total).toBe(priceHire(RATES, 30).total);
  });
});
