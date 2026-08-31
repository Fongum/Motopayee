/**
 * Server-side fetcher for the MFI partner rollup.
 *
 * Split from `mfi-partner-stats.ts` so the shapes and helpers stay importable
 * without constructing a Supabase client.
 */

import { supabaseAdmin } from './auth/server';
import { reportError } from './error-reporting';
import { EMPTY_PARTNER_STATS, INACTIVE_APPLICATION_STATUSES } from './mfi-partner-stats';
import type { PartnerStats } from './mfi-partner-stats';

/**
 * Empty stats on failure rather than a throw: the institutions table should
 * still render its partners, with zeros, if the rollup cannot be computed.
 */
export async function fetchPartnerStats(): Promise<PartnerStats> {
  const { data, error } = await supabaseAdmin.rpc('mfi_partner_stats', {
    p_inactive_statuses: INACTIVE_APPLICATION_STATUSES,
  });

  if (error) {
    reportError(error, { source: 'admin/finance/partners', context: 'mfi_partner_stats' });
    return EMPTY_PARTNER_STATS;
  }
  return { ...EMPTY_PARTNER_STATS, ...(data as PartnerStats | null) };
}
