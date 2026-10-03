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

/**
 * The base price used when no row in vehicle_base_prices matches.
 *
 * This is the old hard-coded figure — 18,000 USD at the 600 XAF peg — kept so
 * that an empty table changes nothing. It is not a valuation of anything: an
 * estimate resting on it has mve_basis 'default' and is labelled as such.
 */
export const DEFAULT_BASE_PRICE_XAF = 18000 * 600;

export type MveBasis = 'model' | 'make' | 'default';

export interface BasePriceRow {
  make: string;
  model: string | null;
  base_price_xaf: number;
}

/** Case- and spacing-insensitive key, matching the table's unique index. */
export function normaliseVehicleName(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Which base price applies: make+model, then the make-wide row (model null),
 * then DEFAULT_BASE_PRICE_XAF.
 */
export function pickBasePrice(
  rows: readonly BasePriceRow[],
  make: string,
  model: string
): { basePriceXaf: number; basis: MveBasis } {
  const mk = normaliseVehicleName(make);
  const md = normaliseVehicleName(model);
  const forMake = rows.filter((row) => normaliseVehicleName(row.make) === mk);

  const exact = md ? forMake.find((row) => normaliseVehicleName(row.model) === md) : undefined;
  if (exact) return { basePriceXaf: Number(exact.base_price_xaf), basis: 'model' };

  const makeWide = forMake.find((row) => row.model == null || normaliseVehicleName(row.model) === '');
  if (makeWide) return { basePriceXaf: Number(makeWide.base_price_xaf), basis: 'make' };

  return { basePriceXaf: DEFAULT_BASE_PRICE_XAF, basis: 'default' };
}

/**
 * Compute Market Value Estimate (MVE) for a vehicle.
 *
 * Returns low/high range and a single suggested price in XAF (CFA franc).
 * The base price comes from pickBasePrice (vehicle_base_prices), already in XAF.
 */
export function computeMVE(
  basePriceXaf: number,
  year: number,
  mileageKm: number,
  conditionGrade: ConditionGrade,
  zone: string
): MVEResult {
  const ageMultiplier = yearlyDepreciation(year);
  const mileageDed = mileageDeduction(mileageKm);
  const conditionDed = CONDITION_DEDUCTIONS[conditionGrade];
  const zoneMult = ZONE_MULTIPLIERS[zone] ?? ZONE_MULTIPLIERS.C;

  const adjustedXaf = basePriceXaf * ageMultiplier * (1 - mileageDed) * (1 - conditionDed) * zoneMult;

  const suggested = Math.round(adjustedXaf / 50000) * 50000; // round to 50k XAF
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
