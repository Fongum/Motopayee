/**
 * Lead dashboard metrics.
 *
 * The admin leads page used to fetch three tables in full and count them with
 * `.filter()` / `.reduce()` in the render. PostgREST truncates an unbounded
 * select at db-max-rows (1000 by default), so every headline number silently
 * under-reported once the table outgrew that — and the conversion rate was a
 * ratio over an arbitrary truncated slice.
 *
 * The counting now happens in Postgres (migration 036). This module owns the
 * shapes those functions return and the presentation logic on top of them, kept
 * pure so it can be tested without a database.
 */


// ─── Vocabulary ───────────────────────────────────────────────────────────────

/**
 * Statuses that count as still-in-play. Passed into the SQL functions rather
 * than duplicated there — the app owns this list, and migration 028 extended it
 * once already.
 */
export const OPEN_LEAD_STATUSES = [
  'new',
  'contacted',
  'interested',
  'qualified',
  'awaiting_assets',
  'ready_for_listing',
  'onboarding',
] as const;

/** Statuses that take a lead out of play. */
export const CLOSED_LEAD_STATUSES = ['converted', 'not_fit', 'closed'] as const;

/**
 * Every status the database will accept, in pipeline order.
 *
 * Mirrors the `launch_leads_status_check` constraint as migration 028 left it.
 * This list was hand-copied into six places — two zod enums, an export
 * whitelist, a filter list and two count queries — which is six chances to miss
 * one the next time the pipeline grows a stage. 028 already grew it once.
 */
export const LEAD_STATUSES = [
  'new',
  'contacted',
  'interested',
  'qualified',
  'awaiting_assets',
  'ready_for_listing',
  'onboarding',
  'converted',
  'not_fit',
  'closed',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Statuses where a partner has engaged — anything past first contact, including
 * those already converted. Used for the "active partners" counts on the launch
 * board and the admin dashboard, which is a different question from whether a
 * lead is still open.
 */
export const PARTNER_ENGAGED_STATUSES = [
  'interested',
  'qualified',
  'awaiting_assets',
  'ready_for_listing',
  'onboarding',
  'converted',
] as const;

export function isOpenLeadStatus(status: string): boolean {
  return (OPEN_LEAD_STATUSES as readonly string[]).includes(status);
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
}

export const METRIC_WINDOW_DAYS = 30;

/** Leads open this long without progress are surfaced as aging. */
export const STALE_LEAD_DAYS = 7;

// ─── Shapes returned by the SQL functions ─────────────────────────────────────

export interface KeyCount {
  key: string;
  count: number;
}

export interface CampaignRollup {
  campaign: string;
  total: number;
  open: number;
  converted: number;
}

export interface LeadMetrics {
  total: number;
  converted: number;
  open: number;
  by_source: KeyCount[];
  by_type: KeyCount[];
  by_status: KeyCount[];
  by_campaign: CampaignRollup[];
}

export interface StaffWorkload {
  assigned_to: string;
  open: number;
  due: number;
}

export interface LeadWorkload {
  unassigned: number;
  stale: number;
  by_staff: StaffWorkload[];
  due_by_campaign: { campaign: string; due: number }[];
}

export const EMPTY_METRICS: LeadMetrics = {
  total: 0,
  converted: 0,
  open: 0,
  by_source: [],
  by_type: [],
  by_status: [],
  by_campaign: [],
};

export const EMPTY_WORKLOAD: LeadWorkload = {
  unassigned: 0,
  stale: 0,
  by_staff: [],
  due_by_campaign: [],
};

// ─── Pure presentation helpers ────────────────────────────────────────────────

export function windowStart(days = METRIC_WINDOW_DAYS, now = new Date()): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Whole-percent conversion rate.
 *
 * Guards the zero case: an empty window used to divide by zero and render NaN%.
 */
export function conversionRate(converted: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((converted / total) * 100);
}

/** The n largest buckets, already ordered by the database. */
export function topN<T>(rows: T[], n: number): T[] {
  return rows.slice(0, n);
}

/** An empty campaign name means the lead arrived outside any campaign. */
export const NO_CAMPAIGN_LABEL = 'Sans campagne';

export function campaignLabel(campaign: string): string {
  return campaign === '' ? NO_CAMPAIGN_LABEL : campaign;
}

/**
 * Join the per-assignee counts onto the staff list.
 *
 * Staff with no open leads still belong on the board — showing zero is the
 * point of a workload view — so this drives off the staff list, not the counts.
 */
export function workloadByStaff<T extends { id: string; full_name: string | null; email: string }>(
  staff: T[],
  byStaff: StaffWorkload[]
): { id: string; name: string; open: number; due: number }[] {
  const counts = new Map(byStaff.map((row) => [row.assigned_to, row]));
  return staff
    .map((member) => {
      const row = counts.get(member.id);
      return {
        id: member.id,
        name: member.full_name ?? member.email,
        open: row?.open ?? 0,
        due: row?.due ?? 0,
      };
    })
    .sort((a, b) => b.open - a.open || b.due - a.due || a.name.localeCompare(b.name));
}

/** Merge the campaign rollup with the due counts, which come from a different window. */
export function campaignPerformance(
  campaigns: CampaignRollup[],
  dueByCampaign: { campaign: string; due: number }[],
  limit = 8
): { campaign: string; total: number; open: number; converted: number; due: number; conversionRate: number }[] {
  const due = new Map(dueByCampaign.map((row) => [row.campaign, row.due]));
  return topN(campaigns, limit).map((row) => ({
    campaign: campaignLabel(row.campaign),
    total: row.total,
    open: row.open,
    converted: row.converted,
    due: due.get(row.campaign) ?? 0,
    conversionRate: conversionRate(row.converted, row.total),
  }));
}
