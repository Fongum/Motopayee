/**
 * MFI partner dashboard rollup.
 *
 * The partners page fetched every assigned application, every offer and every
 * partner profile, then re-filtered those arrays once per institution inside
 * the render. Beyond being quadratic, all three selects were unbounded, so
 * PostgREST truncated them at db-max-rows and the per-partner numbers quietly
 * under-reported. Migration 039 returns the whole rollup in one call.
 *
 * Pure shapes and helpers; fetchers live in the `.server` sibling.
 */

import { toAmount } from './status-totals';

// ─── Vocabulary ───────────────────────────────────────────────────────────────

/**
 * Statuses that take an application out of play. "Active" is everything else,
 * so this is an exclusion list — the page's own rule, passed into the SQL so it
 * cannot drift between the two.
 */
export const INACTIVE_APPLICATION_STATUSES = ['rejected', 'withdrawn', 'disbursed'] as const;

export function isActiveApplicationStatus(status: string): boolean {
  return !(INACTIVE_APPLICATION_STATUSES as readonly string[]).includes(status);
}

// ─── Shapes ───────────────────────────────────────────────────────────────────

export interface PartnerTotals {
  active_partners: number;
  linked_users: number;
  assigned_applications: number;
  /** Text, so `numeric` money keeps its precision in transit. */
  disbursed_value: string;
}

export interface InstitutionStats {
  applications: number;
  active_applications: number;
  disbursed_value: string;
  offers: number;
  interested_offers: number;
  users: number;
  primary_user_email: string | null;
  primary_user_name: string | null;
}

export interface PartnerStats {
  totals: PartnerTotals;
  by_institution: Record<string, InstitutionStats>;
}

export const EMPTY_INSTITUTION_STATS: InstitutionStats = {
  applications: 0,
  active_applications: 0,
  disbursed_value: '0',
  offers: 0,
  interested_offers: 0,
  users: 0,
  primary_user_email: null,
  primary_user_name: null,
};

export const EMPTY_PARTNER_STATS: PartnerStats = {
  totals: {
    active_partners: 0,
    linked_users: 0,
    assigned_applications: 0,
    disbursed_value: '0',
  },
  by_institution: {},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * An institution with no applications yet is absent from the rollup, which
 * means zero — it must still render a row rather than crash the table.
 */
export function institutionStats(stats: PartnerStats, institutionId: string): InstitutionStats {
  return stats.by_institution[institutionId] ?? EMPTY_INSTITUTION_STATS;
}

export function disbursedValue(stats: InstitutionStats): number {
  return toAmount(stats.disbursed_value);
}

export function totalDisbursedValue(stats: PartnerStats): number {
  return toAmount(stats.totals.disbursed_value);
}

/**
 * The address to show for a partner: whichever linked user account the rollup
 * picked, falling back to the institution's own contact address.
 */
export function partnerContactEmail(
  stats: InstitutionStats,
  institutionContactEmail: string | null
): string | null {
  return stats.primary_user_email ?? institutionContactEmail;
}
