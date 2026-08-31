/**
 * Server-side fetchers for the lead dashboard metrics.
 *
 * Split from `launch-lead-metrics.ts` so the shapes and presentation helpers
 * stay importable — and unit-testable — without constructing a Supabase client,
 * which needs environment variables that a test run has no business requiring.
 */

import { supabaseAdmin } from './auth/server';
import { reportError } from './error-reporting';
import {
  EMPTY_METRICS,
  EMPTY_WORKLOAD,
  OPEN_LEAD_STATUSES,
} from './launch-lead-metrics';
import type { KeyCount, LeadMetrics, LeadWorkload } from './launch-lead-metrics';

/**
 * Each returns its empty shape on failure rather than throwing: a metrics panel
 * that cannot load must not take the lead list down with it.
 */

export async function fetchLeadMetrics(since: string): Promise<LeadMetrics> {
  const { data, error } = await supabaseAdmin.rpc('launch_lead_metrics', {
    p_since: since,
    p_open_statuses: OPEN_LEAD_STATUSES,
  });

  if (error) {
    reportError(error, { source: 'admin/leads', context: 'launch_lead_metrics' });
    return EMPTY_METRICS;
  }
  return { ...EMPTY_METRICS, ...(data as LeadMetrics | null) };
}

export async function fetchLeadWorkload(): Promise<LeadWorkload> {
  const { data, error } = await supabaseAdmin.rpc('launch_lead_workload', {
    p_open_statuses: OPEN_LEAD_STATUSES,
  });

  if (error) {
    reportError(error, { source: 'admin/leads', context: 'launch_lead_workload' });
    return EMPTY_WORKLOAD;
  }
  return { ...EMPTY_WORKLOAD, ...(data as LeadWorkload | null) };
}

export async function fetchActivityOutcomes(since: string): Promise<KeyCount[]> {
  const { data, error } = await supabaseAdmin.rpc('launch_lead_activity_outcomes', {
    p_since: since,
  });

  if (error) {
    reportError(error, { source: 'admin/leads', context: 'launch_lead_activity_outcomes' });
    return [];
  }
  return (data as KeyCount[] | null) ?? [];
}
