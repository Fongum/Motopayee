import { supabaseAdmin } from './auth/server';
import type { ZoneCode, IncomeGrade, ConditionGrade, PriceBand, EligibilityResult } from './types';

/**
 * Compute financing eligibility from zone_rules table.
 * Falls back to a conservative default if no matching rule found.
 */
export async function computeEligibility(
  zone: ZoneCode,
  incomeGrade: IncomeGrade,
  vehiclePriceBand: PriceBand,
  conditionGrade: ConditionGrade
): Promise<EligibilityResult> {
  const { data, error } = await supabaseAdmin
    .from('zone_rules')
    .select('*')
    .eq('zone', zone)
    .eq('income_grade', incomeGrade)
    .eq('vehicle_price_band', vehiclePriceBand)
    .eq('condition_grade', conditionGrade)
    .maybeSingle();

  if (error || !data) {
    // Conservative default
    return {
      financeable: false,
      down_payment_percent: 40,
      max_tenor: 12,
      manual_review_required: true,
    };
  }

  return {
    financeable: data.financeable,
    down_payment_percent: data.down_payment_percent,
    max_tenor: data.max_tenor_months,
    manual_review_required: data.manual_review_required,
  };
}
