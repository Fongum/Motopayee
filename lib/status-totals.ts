/**
 * Status-bucketed count-and-amount totals.
 *
 * Several admin dashboards show the same thing: how many rows sit in each
 * status, and how much money they add up to. Each of them used to compute it by
 * fetching the whole table unbounded and reducing in JavaScript, which PostgREST
 * truncates at db-max-rows (1000 by default) — so the figures silently
 * under-reported once the table outgrew that.
 *
 * The SQL side of each dashboard now returns this shape, keyed by status.
 */

/**
 * One bucket.
 *
 * `amount` is a string because the underlying columns are `numeric` and the SQL
 * functions render them as text: routing money through a JavaScript float on
 * the way out is how a reconciliation ends up off by centimes. Conversion
 * happens once, at the boundary, via `statusAmount`.
 */
export interface StatusTotal {
  count: number;
  amount: string;
}

/** Buckets are absent when no row holds that status — which reads as zero. */
export type StatusTotals<K extends string> = Partial<Record<K, StatusTotal>>;

export function toAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function statusCount<K extends string>(totals: StatusTotals<K>, status: K): number {
  return totals[status]?.count ?? 0;
}

export function statusAmount<K extends string>(totals: StatusTotals<K>, status: K): number {
  return toAmount(totals[status]?.amount);
}

/** Sum across several statuses, for a tile that spans more than one bucket. */
export function statusAmountOf<K extends string>(totals: StatusTotals<K>, statuses: readonly K[]): number {
  return statuses.reduce((sum, status) => sum + statusAmount(totals, status), 0);
}

export function statusCountOf<K extends string>(totals: StatusTotals<K>, statuses: readonly K[]): number {
  return statuses.reduce((sum, status) => sum + statusCount(totals, status), 0);
}
