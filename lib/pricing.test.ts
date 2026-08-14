import { describe, it, expect } from 'vitest';
import { computeMVE, computePriceBand } from './pricing';
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
    computeMVE('Toyota', 'Corolla', currentYear, 0, 'A' as ConditionGrade, 'A');

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
    const newer = computeMVE('Toyota', 'Corolla', currentYear, 0, 'A' as ConditionGrade, 'A');
    const older = computeMVE('Toyota', 'Corolla', currentYear - 6, 0, 'A' as ConditionGrade, 'A');
    expect(newer.suggested_price).toBeGreaterThan(older.suggested_price);
  });

  it('reduces value as mileage increases', () => {
    const low = computeMVE('Toyota', 'Corolla', currentYear, 20_000, 'A' as ConditionGrade, 'A');
    const high = computeMVE('Toyota', 'Corolla', currentYear, 120_000, 'A' as ConditionGrade, 'A');
    expect(high.suggested_price).toBeLessThan(low.suggested_price);
  });

  it('reduces value as condition grade worsens', () => {
    const a = computeMVE('Toyota', 'Corolla', currentYear, 0, 'A' as ConditionGrade, 'A');
    const d = computeMVE('Toyota', 'Corolla', currentYear, 0, 'D' as ConditionGrade, 'A');
    expect(d.suggested_price).toBeLessThan(a.suggested_price);
  });

  it('values a prime zone (A) at least as high as a remote zone (C)', () => {
    const zoneA = computeMVE('Toyota', 'Corolla', currentYear, 0, 'A' as ConditionGrade, 'A');
    const zoneC = computeMVE('Toyota', 'Corolla', currentYear, 0, 'A' as ConditionGrade, 'C');
    expect(zoneA.suggested_price).toBeGreaterThan(zoneC.suggested_price);
  });

  it('treats an unknown zone as the conservative (C) multiplier', () => {
    const unknown = computeMVE('Toyota', 'Corolla', currentYear, 0, 'A' as ConditionGrade, 'Z');
    const zoneC = computeMVE('Toyota', 'Corolla', currentYear, 0, 'A' as ConditionGrade, 'C');
    expect(unknown.suggested_price).toBe(zoneC.suggested_price);
  });

  it('never depreciates below the 30% floor for very old vehicles', () => {
    const ancient = computeMVE('Toyota', 'Corolla', currentYear - 40, 0, 'A' as ConditionGrade, 'A');
    const tenYears = computeMVE('Toyota', 'Corolla', currentYear - 10, 0, 'A' as ConditionGrade, 'A');
    // Both clamp to the floor, so a 40-year-old is worth the same as the floor point, not less.
    expect(ancient.suggested_price).toBe(tenYears.suggested_price);
  });
});
