/**
 * Finance reconciliation dashboard figures.
 *
 * The admin finance page summed commission revenue and financed vehicle value
 * in JavaScript over unbounded selects, which PostgREST truncates at
 * db-max-rows (1000 by default) — so every headline figure under-reported once
 * the tables outgrew that. Migration 037 moved the arithmetic into Postgres.
 *
 * Pure shapes and helpers only; the fetchers live in `finance-dashboard.server`
 * so this module can be tested without a Supabase client.
 */

import { statusAmount, statusCount } from './status-totals';
import type { StatusTotals } from './status-totals';

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export const COMMISSION_STATUSES = ['expected', 'invoiced', 'paid', 'waived'] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export function isCommissionStatus(value: string | undefined | null): value is CommissionStatus {
  return typeof value === 'string' && (COMMISSION_STATUSES as readonly string[]).includes(value);
}

export const PIPELINE_STATUSES = ['approved', 'disbursed'] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export function isPipelineStatus(value: string | undefined | null): value is PipelineStatus {
  return typeof value === 'string' && (PIPELINE_STATUSES as readonly string[]).includes(value);
}

// ─── Shapes returned by the SQL functions ─────────────────────────────────────

export type CommissionTotals = StatusTotals<CommissionStatus>;
export type PipelineTotals = StatusTotals<PipelineStatus>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Thin, named readers over the shared bucket shape. They exist so the page
 * reads in its own vocabulary — "how much commission is invoiced" rather than
 * "what is in the invoiced bucket" — while the arithmetic lives in one place.
 */

export function commissionCount(totals: CommissionTotals, status: CommissionStatus): number {
  return statusCount(totals, status);
}

export function commissionAmount(totals: CommissionTotals, status: CommissionStatus): number {
  return statusAmount(totals, status);
}

export function pipelineCount(totals: PipelineTotals, status: PipelineStatus): number {
  return statusCount(totals, status);
}

/** The financed vehicle value behind the applications in that status. */
export function pipelineValue(totals: PipelineTotals, status: PipelineStatus): number {
  return statusAmount(totals, status);
}

/**
 * Select string for the application list.
 *
 * The commission is embedded rather than fetched in a second round trip keyed
 * by application id. When the page filters by commission status the embed
 * becomes `!inner`, which expresses the filter as a join — the previous code
 * resolved matching application ids with an unbounded select and passed them
 * back through `.in()`, so the filter silently dropped everything past the
 * thousandth match.
 */
export function financeListSelect(filterByCommission: boolean): string {
  const commissionJoin = filterByCommission ? 'finance_commissions!inner' : 'finance_commissions';
  return `
    id,
    status,
    down_payment_percent,
    max_tenor,
    decided_at,
    disbursed_at,
    listing:listings(asking_price, zone, vehicle:vehicles(make, model, year)),
    buyer:profiles!buyer_id(full_name, email, phone, city),
    mfi:mfi_institutions(name, code),
    commission:${commissionJoin}(id, application_id, commission_rate_percent, commission_amount_xaf, status, due_at, paid_at, notes)
  `;
}

/**
 * PostgREST returns a one-to-one embed as an object, but a one-to-many as an
 * array, and `finance_commissions` is unique per application only by
 * constraint. Normalise so the page never has to care which it got.
 */
export function firstEmbedded<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null;
  return embed ?? null;
}
