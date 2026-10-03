import { describe, it, expect } from 'vitest';
import { computeMVE, computePriceBand, DEFAULT_BASE_PRICE_XAF, pickBasePrice, normaliseVehicleName } from './pricing';
import type { ConditionGrade } from './types';

const currentYear = new Date().getFullYear();

describe('computePriceBand', () => {
  it('flags green when asking is at or below the suggested price', () => {
    expect(computePriceBand(900_000, 1_000_000)).toBe('green');
    expect(computePriceBand(1_000_000, 1_000_000)).toBe('green');
  });

  it('treats the +15% boundary as still green', () => {
    expect(computePriceBand(1_150_000, 1_000_000)).toBe('green');
  });

  it('flags yellow for 15-30% over suggested', () => {
    expect(computePriceBand(1_150_001, 1_000_000)).toBe('yellow');
    expect(computePriceBand(1_300_000, 1_000_000)).toBe('yellow');
  });

  it('flags red for more than 30% over suggested', () => {
    expect(computePriceBand(1_300_001, 1_000_000)).toBe('red');
    expect(computePriceBand(2_000_000, 1_000_000)).toBe('red');
  });

  it('falls back to yellow when suggested price is zero (avoids divide-by-zero)', () => {
    expect(computePriceBand(1_000_000, 0)).toBe('yellow');
  });
});

describe('computeMVE', () => {
  const base = () =>
    computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 0, 'A' as ConditionGrade, 'A');

  it('returns suggested price within the low/high band', () => {
    const { mve_low, suggested_price, mve_high } = base();
    expect(mve_low).toBeLessThanOrEqual(suggested_price);
    expect(suggested_price).toBeLessThanOrEqual(mve_high);
    expect(mve_low).toBeGreaterThan(0);
  });

  it('rounds every figure to the nearest 50,000 XAF', () => {
    const { mve_low, suggested_price, mve_high } = base();
    expect(mve_low % 50_000).toBe(0);
    expect(suggested_price % 50_000).toBe(0);
    expect(mve_high % 50_000).toBe(0);
  });

  it('values a newer vehicle at least as high as an older one', () => {
    const newer = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 0, 'A' as ConditionGrade, 'A');
    const older = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear - 6, 0, 'A' as ConditionGrade, 'A');
    expect(newer.suggested_price).toBeGreaterThan(older.suggested_price);
  });

  it('reduces value as mileage increases', () => {
    const low = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 20_000, 'A' as ConditionGrade, 'A');
    const high = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 120_000, 'A' as ConditionGrade, 'A');
    expect(high.suggested_price).toBeLessThan(low.suggested_price);
  });

  it('reduces value as condition grade worsens', () => {
    const a = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 0, 'A' as ConditionGrade, 'A');
    const d = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 0, 'D' as ConditionGrade, 'A');
    expect(d.suggested_price).toBeLessThan(a.suggested_price);
  });

  it('values a prime zone (A) at least as high as a remote zone (C)', () => {
    const zoneA = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 0, 'A' as ConditionGrade, 'A');
    const zoneC = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 0, 'A' as ConditionGrade, 'C');
    expect(zoneA.suggested_price).toBeGreaterThan(zoneC.suggested_price);
  });

  it('treats an unknown zone as the conservative (C) multiplier', () => {
    const unknown = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 0, 'A' as ConditionGrade, 'Z');
    const zoneC = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear, 0, 'A' as ConditionGrade, 'C');
    expect(unknown.suggested_price).toBe(zoneC.suggested_price);
  });

  it('never depreciates below the 30% floor for very old vehicles', () => {
    const ancient = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear - 40, 0, 'A' as ConditionGrade, 'A');
    const tenYears = computeMVE(DEFAULT_BASE_PRICE_XAF, currentYear - 10, 0, 'A' as ConditionGrade, 'A');
    // Both clamp to the floor, so a 40-year-old is worth the same as the floor point, not less.
    expect(ancient.suggested_price).toBe(tenYears.suggested_price);
  });
});

describe('an empty base-price table changes nothing', () => {
  // The formula as it stood before migration 046: a USD base of 18,000 for
  // every vehicle, converted at 600 XAF per USD after the adjustments.
  function legacyMVE(year: number, mileageKm: number, grade: ConditionGrade, zone: string) {
    const ZONE: Record<string, number> = { A: 1.0, B: 0.92, C: 0.85 };
    const COND: Record<string, number> = { A: 0, B: 0.1, C: 0.22, D: 0.38 };
    const age = Math.max(0, new Date().getFullYear() - year);
    const ageMult = Math.max(0.3, 1 - age * 0.12);
    const mileageDed = mileageKm <= 30000 ? 0 : Math.min(0.3, Math.floor((mileageKm - 30000) / 10000) * 0.025);
    const adjustedUsd = 18000 * ageMult * (1 - mileageDed) * (1 - COND[grade]) * (ZONE[zone] ?? ZONE.C);
    const suggested = Math.round((adjustedUsd * 600) / 50000) * 50000;
    return {
      mve_low: Math.round((suggested * 0.92) / 50000) * 50000,
      mve_high: Math.round((suggested * 1.08) / 50000) * 50000,
      suggested_price: suggested,
    };
  }

  it('reproduces the old estimate exactly across ages, mileages, grades and zones', () => {
    const mismatches: string[] = [];
    for (let age = 0; age <= 15; age++) {
      for (const km of [0, 30000, 45000, 87000, 150000, 400000]) {
        for (const grade of ['A', 'B', 'C', 'D'] as ConditionGrade[]) {
          for (const zone of ['A', 'B', 'C', 'Z']) {
            const year = currentYear - age;
            const now = computeMVE(DEFAULT_BASE_PRICE_XAF, year, km, grade, zone);
            const then = legacyMVE(year, km, grade, zone);
            if (JSON.stringify(now) !== JSON.stringify(then)) mismatches.push(`${year}/${km}/${grade}/${zone}`);
          }
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('falls back to the default with no rows', () => {
    expect(pickBasePrice([], 'Toyota', 'Corolla')).toEqual({ basePriceXaf: DEFAULT_BASE_PRICE_XAF, basis: 'default' });
  });
});

describe('pickBasePrice', () => {
  const rows = [
    { make: 'Toyota', model: 'Corolla', base_price_xaf: 14_000_000 },
    { make: 'Toyota', model: null, base_price_xaf: 16_000_000 },
    { make: 'Hyundai', model: 'Tucson', base_price_xaf: 19_000_000 },
  ];

  it('prefers the exact make and model', () => {
    expect(pickBasePrice(rows, 'Toyota', 'Corolla')).toEqual({ basePriceXaf: 14_000_000, basis: 'model' });
  });

  it('falls back to the make-wide row for an unpriced model', () => {
    expect(pickBasePrice(rows, 'Toyota', 'RAV4')).toEqual({ basePriceXaf: 16_000_000, basis: 'make' });
  });

  it('falls back to the default when the make has no make-wide row', () => {
    expect(pickBasePrice(rows, 'Hyundai', 'Elantra').basis).toBe('default');
  });

  it('matches regardless of case and spacing, like the unique index', () => {
    expect(pickBasePrice(rows, '  toyota ', 'COROLLA').basis).toBe('model');
    expect(normaliseVehicleName('  Land   Cruiser ')).toBe('land cruiser');
  });

  it('does not match one make\'s model under another make', () => {
    expect(pickBasePrice(rows, 'Kia', 'Corolla').basis).toBe('default');
  });

  it('accepts bigint prices that arrive as strings', () => {
    const fromDb = [{ make: 'Toyota', model: 'Corolla', base_price_xaf: '14000000' as unknown as number }];
    expect(pickBasePrice(fromDb, 'Toyota', 'Corolla').basePriceXaf).toBe(14_000_000);
  });

  it('makes make and model actually move the estimate', () => {
    const corolla = computeMVE(pickBasePrice(rows, 'Toyota', 'Corolla').basePriceXaf, currentYear - 8, 90000, 'B', 'A');
    const tucson = computeMVE(pickBasePrice(rows, 'Hyundai', 'Tucson').basePriceXaf, currentYear - 8, 90000, 'B', 'A');
    expect(tucson.suggested_price).toBeGreaterThan(corolla.suggested_price);
  });
});
