import type { ConditionGrade, MVEResult, PriceBand } from './types';

// Zone multipliers (relative cost of living / import duties)
const ZONE_MULTIPLIERS: Record<string, number> = {
  A: 1.0,  // Douala / Yaoundé — highest demand
  B: 0.92, // Secondary cities
  C: 0.85, // Rural / remote zones
};

// Condition grade deductions (applied to base value)
const CONDITION_DEDUCTIONS: Record<ConditionGrade, number> = {
  A: 0.0,   // Excellent — no deduction
  B: 0.10,  // Good — 10% off
  C: 0.22,  // Fair — 22% off
  D: 0.38,  // Poor — 38% off
};

// Year depreciation: ~12% per year, floor at 30% of new price
function yearlyDepreciation(year: number): number {
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - year);
  return Math.max(0.30, 1 - age * 0.12);
}

// Mileage band deduction (per 10 000 km above 30 000 km threshold)
function mileageDeduction(mileage: number): number {
  if (mileage <= 30000) return 0;
  const bands = Math.floor((mileage - 30000) / 10000);
  return Math.min(0.30, bands * 0.025);
}

// Very simplified market base prices (USD). Real implementation would use a lookup table or ML model.
const BASE_PRICES: Record<string, number> = {
  // Make-agnostic defaults by era; override with real data as available
  DEFAULT: 18000,
};

function getBasePrice(make: string, model: string): number {
  const key = `${make.toUpperCase()}_${model.toUpperCase()}`;
  return BASE_PRICES[key] ?? BASE_PRICES.DEFAULT;
}

/**
 * Compute Market Value Estimate (MVE) for a vehicle.
 *
 * Returns low/high range and a single suggested price in XAF (CFA franc).
 * Note: USD × 600 ≈ XAF (rough peg used here; adjust as needed).
 */
export function computeMVE(
  make: string,
  model: string,
  year: number,
  mileageKm: number,
  conditionGrade: ConditionGrade,
  zone: string
): MVEResult {
  const baseUsd = getBasePrice(make, model);
  const ageMultiplier = yearlyDepreciation(year);
  const mileageDed = mileageDeduction(mileageKm);
  const conditionDed = CONDITION_DEDUCTIONS[conditionGrade];
  const zoneMult = ZONE_MULTIPLIERS[zone] ?? ZONE_MULTIPLIERS.C;

  const adjustedUsd = baseUsd * ageMultiplier * (1 - mileageDed) * (1 - conditionDed) * zoneMult;

  const USD_TO_XAF = 600;
  const suggested = Math.round((adjustedUsd * USD_TO_XAF) / 50000) * 50000; // round to 50k XAF
  const mve_low = Math.round(suggested * 0.92 / 50000) * 50000;
  const mve_high = Math.round(suggested * 1.08 / 50000) * 50000;

  return { mve_low, mve_high, suggested_price: suggested };
}

/**
 * Compute price band based on asking price vs. suggested price.
 * green  = within ±15%
 * yellow = overpriced 15-30%
 * red    = overpriced >30%
 */
export function computePriceBand(asking: number, suggested: number): PriceBand {
  if (suggested === 0) return 'yellow';
  const ratio = asking / suggested;
  if (ratio <= 1.15) return 'green';
  if (ratio <= 1.30) return 'yellow';
  return 'red';
}
