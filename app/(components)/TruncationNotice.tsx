interface Props {
  /** Rows actually rendered. */
  shown: number;
  /** Rows matching the current filters, from an exact count. */
  total: number | null | undefined;
  /** Plural noun for the rows, in French: "dossiers", "reservations". */
  noun: string;
  /**
   * Whether the page also shows aggregate figures. Those are computed in the
   * database over everything, so saying so stops the cap reading as if the
   * totals were capped too.
   */
  totalsAreComplete?: boolean;
}

/**
 * Says out loud that a list is capped.
 *
 * These lists used to be unbounded, which does not mean unlimited: PostgREST
 * stops at db-max-rows (1000 by default) and returns a truncated page with no
 * error. Staff working a filtered queue had no way to tell they were seeing
 * part of it. The cap is deliberate now, and announced.
 */
export default function TruncationNotice({ shown, total, noun, totalsAreComplete }: Props) {
  if (total == null || total <= shown) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Affichage des {shown} {noun} les plus recents sur {total} correspondants.
      {totalsAreComplete
        ? ' Les totaux ci-dessus portent sur l ensemble.'
        : ' Affinez les filtres pour voir le reste.'}
    </div>
  );
}
