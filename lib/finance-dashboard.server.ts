/**
 * Server-side fetchers for the finance reconciliation dashboard.
 *
 * Split from `finance-dashboard.ts` so the shapes and helpers stay importable
 * without constructing a Supabase client.
 */

import { supabaseAdmin } from './auth/server';
import { reportError } from './error-reporting';
import type { CommissionTotals, PipelineTotals } from './finance-dashboard';

/**
 * Both return empty totals on failure rather than throwing: a stat tile that
 * cannot load must not take the reconciliation table down with it. An empty
 * bucket reads as zero, which is the truthful answer when no rows matched.
 */

export async function fetchCommissionTotals(): Promise<CommissionTotals> {
  const { data, error } = await supabaseAdmin.rpc('finance_commission_totals');

  if (error) {
    reportError(error, { source: 'admin/finance', context: 'finance_commission_totals' });
    return {};
  }
  return (data as CommissionTotals | null) ?? {};
}

export async function fetchPipelineTotals(): Promise<PipelineTotals> {
  const { data, error } = await supabaseAdmin.rpc('financing_pipeline_totals');

  if (error) {
    reportError(error, { source: 'admin/finance', context: 'financing_pipeline_totals' });
    return {};
  }
  return (data as PipelineTotals | null) ?? {};
}
