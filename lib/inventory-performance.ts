export interface InventoryPerformanceRow {
  listing_id: string;
  views: number;
  contacts: number;
  favourites: number;
}

export interface InventoryTotals {
  views: number;
  contacts: number;
  favourites: number;
  /** Share of views that turned into a contact, 0-1. Zero when nobody looked. */
  contactRate: number;
}

/**
 * Fold raw per-event listing ids into one row per listing. Every listing in
 * `listingIds` gets a row, so a vehicle nobody looked at reads as an explicit
 * zero rather than going missing from the table.
 */
export function summarizeInventoryPerformance(input: {
  listingIds: string[];
  viewListingIds: string[];
  /** Already deduped to one per viewer, per day — see dedupeContactEvents. */
  contactListingIds: string[];
  favouriteListingIds: string[];
}): InventoryPerformanceRow[] {
  const rows = new Map<string, InventoryPerformanceRow>(
    input.listingIds.map((id) => [id, { listing_id: id, views: 0, contacts: 0, favourites: 0 }])
  );

  const bump = (ids: string[], field: 'views' | 'contacts' | 'favourites') => {
    for (const id of ids) {
      const row = rows.get(id);
      if (row) row[field] += 1;
    }
  };

  bump(input.viewListingIds, 'views');
  bump(input.contactListingIds, 'contacts');
  bump(input.favouriteListingIds, 'favourites');

  return Array.from(rows.values());
}

export function inventoryTotals(rows: InventoryPerformanceRow[]): InventoryTotals {
  const views = rows.reduce((sum, row) => sum + row.views, 0);
  const contacts = rows.reduce((sum, row) => sum + row.contacts, 0);
  const favourites = rows.reduce((sum, row) => sum + row.favourites, 0);

  return { views, contacts, favourites, contactRate: views > 0 ? contacts / views : 0 };
}

/** Most interest first: contacts lead, views break the tie, then favourites. */
export function rankByDemand(rows: InventoryPerformanceRow[]): InventoryPerformanceRow[] {
  return [...rows].sort(
    (a, b) => b.contacts - a.contacts || b.views - a.views || b.favourites - a.favourites
  );
}

export interface InventoryAttention {
  /** Seen but never contacted — usually a price or photo problem. */
  ignored: InventoryPerformanceRow[];
  /** Barely seen at all — a visibility problem, not a desirability one. */
  invisible: InventoryPerformanceRow[];
}

/**
 * Split the inventory into the two problems a dealer can actually act on.
 * A vehicle with plenty of views and no contacts is priced or presented
 * wrong; one with almost no views is not being found in the first place.
 * Vehicles getting contacts are working and are deliberately left out.
 */
export function inventoryAttention(
  rows: InventoryPerformanceRow[],
  { minViews = 10 }: { minViews?: number } = {}
): InventoryAttention {
  const ignored: InventoryPerformanceRow[] = [];
  const invisible: InventoryPerformanceRow[] = [];

  for (const row of rows) {
    if (row.contacts > 0) continue;
    if (row.views >= minViews) ignored.push(row);
    else invisible.push(row);
  }

  return {
    ignored: ignored.sort((a, b) => b.views - a.views),
    invisible: invisible.sort((a, b) => a.views - b.views),
  };
}
