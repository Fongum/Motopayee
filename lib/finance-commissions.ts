import { supabaseAdmin } from '@/lib/auth/server';
import { logger } from '@/lib/logger';

const DEFAULT_COMMISSION_RATE_PERCENT = 2;

type CommissionApplicationRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  mfi_institution_id: string | null;
  listing?: { asking_price: number | null } | null;
};

type ExistingCommissionRow = {
  id: string;
  status: 'expected' | 'invoiced' | 'paid' | 'waived';
  created_by: string | null;
  paid_at: string | null;
};

export function calculateFinanceCommission(vehicleValueXaf: number, ratePercent = DEFAULT_COMMISSION_RATE_PERCENT) {
  return Math.round((vehicleValueXaf * ratePercent) / 100);
}

export async function ensureFinanceCommission(
  applicationId: string,
  actorId: string | null,
  options: { dueNow?: boolean } = {}
) {
  const { data: app } = await supabaseAdmin
    .from('financing_applications')
    .select('id, listing_id, buyer_id, mfi_institution_id, listing:listings(asking_price)')
    .eq('id', applicationId)
    .single();

  if (!app) return null;

  const application = app as unknown as CommissionApplicationRow;
  const vehicleValue = Number(application.listing?.asking_price ?? 0);
  const commissionAmount = calculateFinanceCommission(vehicleValue);

  const { data: existing } = await supabaseAdmin
    .from('finance_commissions')
    .select('id, status, created_by, paid_at')
    .eq('application_id', application.id)
    .maybeSingle();

  const existingCommission = existing as ExistingCommissionRow | null;
  const basePayload = {
    application_id: application.id,
    listing_id: application.listing_id,
    buyer_id: application.buyer_id,
    mfi_institution_id: application.mfi_institution_id,
    vehicle_value_xaf: vehicleValue,
    commission_rate_percent: DEFAULT_COMMISSION_RATE_PERCENT,
    commission_amount_xaf: commissionAmount,
    due_at: options.dueNow && existingCommission?.status !== 'paid'
      ? new Date().toISOString()
      : undefined,
  };

  if (existingCommission) {
    const { data, error } = await supabaseAdmin
      .from('finance_commissions')
      .update(basePayload)
      .eq('id', existingCommission.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update finance commission', { err: error });
      return null;
    }

    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('finance_commissions')
    .upsert({
      ...basePayload,
      status: 'expected',
      created_by: actorId,
    }, { onConflict: 'application_id' })
    .select()
    .single();

  if (error) {
    logger.error('Failed to ensure finance commission', { err: error });
    return null;
  }

  return data;
}
