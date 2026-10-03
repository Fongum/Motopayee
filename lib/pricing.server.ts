import { supabaseAdmin } from '@/lib/auth/server';
import { fetchAllRows } from '@/lib/fetch-all-rows';
import { logger } from '@/lib/logger';
import {
  computeMVE,
  computePriceBand,
  normaliseVehicleName,
  pickBasePrice,
  type BasePriceRow,
  type MveBasis,
} from '@/lib/pricing';
import type { ConditionGrade, MVEResult, PriceBand } from '@/lib/types';

/**
 * Every base price row. The table holds one row per make/model staff have
 * priced — hundreds at most — so it is read whole and matched in JS by the
 * same normalisation as its unique index, rather than with ilike (where `_`
 * and `%` in a model name are wildcards).
 */
export async function fetchBasePrices(): Promise<BasePriceRow[]> {
  const { data, error } = await fetchAllRows((from, to) =>
    supabaseAdmin
      .from('vehicle_base_prices')
      .select('make, model, base_price_xaf')
      .order('id')
      .range(from, to)
  );
  if (error) {
    // Falling back to the default is safe — the estimate is then marked
    // mve_basis 'default' — but it should not happen silently.
    logger.error('pricing.base_prices_unavailable', { error });
  }
  return data;
}

export interface Estimate extends MVEResult {
  price_band: PriceBand;
  mve_basis: MveBasis;
}

export function estimateFor(
  rows: readonly BasePriceRow[],
  vehicle: { make: string; model: string; year: number; mileage_km: number | null },
  conditionGrade: ConditionGrade,
  zone: string,
  askingPrice: number
): Estimate {
  const { basePriceXaf, basis } = pickBasePrice(rows, vehicle.make, vehicle.model);
  const mve = computeMVE(basePriceXaf, vehicle.year, vehicle.mileage_km ?? 0, conditionGrade, zone);
  return { ...mve, price_band: computePriceBand(askingPrice, mve.suggested_price), mve_basis: basis };
}

/**
 * Re-estimate every listing of one make that already carries an estimate.
 *
 * Estimates are computed at inspection, so without this a base price entered
 * today would only reach vehicles inspected from now on, and every listing
 * already priced off the default would keep that figure indefinitely.
 * Returns how many listings were updated.
 */
export async function recomputeEstimatesForMake(make: string): Promise<number> {
  const rows = await fetchBasePrices();
  const target = normaliseVehicleName(make);

  const { data: listings, error } = await fetchAllRows((from, to) =>
    supabaseAdmin
      .from('listings')
      .select('id, asking_price, zone, vehicle:vehicles!inner(make, model, year, mileage_km, condition_grade)')
      .not('suggested_price', 'is', null)
      .not('vehicle.condition_grade', 'is', null)
      .order('id')
      .range(from, to)
  );
  if (error) {
    logger.error('pricing.recompute_fetch_failed', { make, error });
    return 0;
  }

  let updated = 0;
  for (const listing of listings) {
    const vehicle = Array.isArray(listing.vehicle) ? listing.vehicle[0] : listing.vehicle;
    if (!vehicle?.condition_grade || normaliseVehicleName(vehicle.make) !== target) continue;

    const estimate = estimateFor(
      rows,
      vehicle,
      vehicle.condition_grade as ConditionGrade,
      listing.zone,
      Number(listing.asking_price)
    );
    const { error: updateError } = await supabaseAdmin
      .from('listings')
      .update({
        mve_low: estimate.mve_low,
        mve_high: estimate.mve_high,
        suggested_price: estimate.suggested_price,
        price_band: estimate.price_band,
        mve_basis: estimate.mve_basis,
      })
      .eq('id', listing.id);
    if (updateError) logger.error('pricing.recompute_update_failed', { listingId: listing.id, error: updateError });
    else updated += 1;
  }
  return updated;
}
