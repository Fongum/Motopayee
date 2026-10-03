import { reportError } from '@/lib/error-reporting';

/**
 * Telling "that row does not exist" apart from "the query broke".
 *
 * `if (error || !data) notFound()` answers both with a 404. That is how seven
 * routes embedding the polymorphic `documents` table returned 404 for every
 * request for years (PGRST200, a query that could never succeed) and nobody
 * noticed: a 404 on a detail page looks like a bad link, not an outage.
 *
 * Only two errors mean "no such row" here:
 * - PGRST116 — `.single()` matched zero rows;
 * - 22P02 — the id in the URL is not a valid uuid, so it cannot match one.
 * Anything else is a broken query, a missing migration or an outage, and is
 * reported and surfaced as an error rather than dressed up as a 404.
 */

export interface PostgrestFailure {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

const MEANS_NOT_FOUND = new Set(['PGRST116', '22P02']);

/** True when the error only says the requested row does not exist. */
export function isNotFoundError(error: PostgrestFailure | null | undefined): boolean {
  return !!error && MEANS_NOT_FOUND.has(error.code ?? '');
}

/** True for an error that is a real failure, not a missing row. */
export function isQueryFailure(error: PostgrestFailure | null | undefined): error is PostgrestFailure {
  return !!error && !isNotFoundError(error);
}

export class QueryError extends Error {
  readonly code: string | undefined;

  constructor(failure: PostgrestFailure, context: string) {
    super(`${context}: ${failure.code ?? 'query_failed'} ${failure.message}`);
    this.name = 'QueryError';
    this.code = failure.code;
  }
}

/**
 * The row, or null when it does not exist. Throws (after reporting) on any
 * other error, so a page renders its error boundary instead of a 404.
 *
 *   const listing = rowOrNull(await query.single(), 'admin/listings/[id]');
 *   if (!listing) notFound();
 */
export function rowOrNull<T>(
  result: { data: T | null; error: PostgrestFailure | null },
  context: string
): T | null {
  if (isQueryFailure(result.error)) {
    // Reported here because Next redacts a server component's error message
    // to a digest before the error boundary sees it.
    reportError(result.error, { source: 'query', route: context });
    throw new QueryError(result.error, context);
  }
  return result.data ?? null;
}
