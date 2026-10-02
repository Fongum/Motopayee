/**
 * Read every row a query matches, a page at a time.
 *
 * PostgREST stops an unbounded select at db-max-rows (1000 on Supabase) and
 * returns that short page with no error. Anything that counts or sums the rows
 * it gets back — views per day, contacts per listing, revenue — therefore
 * under-reports once the table passes the cap, and then flat-lines at it.
 *
 * Use this only where every row genuinely has to cross the wire (the rows are
 * reduced in JS by logic that has no SQL twin, e.g. contact-event dedupe). A
 * plain count belongs in `{ count: 'exact', head: true }`, and an aggregate
 * over a large table belongs in a SQL function.
 *
 * The caller's query MUST order by a unique column (normally `id`): without a
 * total order, Postgres may return the same row on two pages and skip another.
 *
 * Kept free of `supabaseAdmin` so it can be unit-tested — see
 * launch-lead-metrics.ts for why that split matters.
 */

/** Must not exceed the server's db-max-rows, or a full page reads as the last. */
export const FETCH_ALL_PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = FETCH_ALL_PAGE_SIZE
): Promise<PageResult<T> & { data: T[] }> {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    // A failed page means the total is unknown, not that it is what we have
    // so far. Surface the error alongside the partial rows; callers decide.
    if (error) return { data: rows, error };

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return { data: rows, error: null };
  }
}
