import { describe, it, expect } from 'vitest';
import {
  inventoryAttention,
  inventoryTotals,
  rankByDemand,
  summarizeInventoryPerformance,
  type InventoryPerformanceRow,
} from './inventory-performance';

const row = (over: Partial<InventoryPerformanceRow> & { listing_id: string }): InventoryPerformanceRow => ({
  views: 0,
  contacts: 0,
  favourites: 0,
  ...over,
});

describe('summarizeInventoryPerformance', () => {
  it('counts events against the right listing', () => {
    const rows = summarizeInventoryPerformance({
      listingIds: ['a', 'b'],
      viewListingIds: ['a', 'a', 'b'],
      contactListingIds: ['a'],
      favouriteListingIds: ['b', 'b'],
    });

    expect(rows).toEqual([
      { listing_id: 'a', views: 2, contacts: 1, favourites: 0 },
      { listing_id: 'b', views: 1, contacts: 0, favourites: 2 },
    ]);
  });

  it('keeps a listing nobody looked at, as an explicit zero', () => {
    const rows = summarizeInventoryPerformance({
      listingIds: ['a', 'quiet'],
      viewListingIds: ['a'],
      contactListingIds: [],
      favouriteListingIds: [],
    });

    expect(rows.find((r) => r.listing_id === 'quiet')).toEqual({
      listing_id: 'quiet',
      views: 0,
      contacts: 0,
      favourites: 0,
    });
  });

  it('ignores events for listings outside the inventory', () => {
    const rows = summarizeInventoryPerformance({
      listingIds: ['a'],
      viewListingIds: ['a', 'someone-elses-listing'],
      contactListingIds: ['someone-elses-listing'],
      favouriteListingIds: [],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ listing_id: 'a', views: 1, contacts: 0, favourites: 0 });
  });

  it('returns nothing for an empty inventory', () => {
    expect(
      summarizeInventoryPerformance({
        listingIds: [],
        viewListingIds: ['a'],
        contactListingIds: [],
        favouriteListingIds: [],
      })
    ).toEqual([]);
  });
});

describe('inventoryTotals', () => {
  it('sums each metric and derives the contact rate', () => {
    const totals = inventoryTotals([
      row({ listing_id: 'a', views: 30, contacts: 3, favourites: 1 }),
      row({ listing_id: 'b', views: 10, contacts: 1, favourites: 2 }),
    ]);

    expect(totals).toEqual({ views: 40, contacts: 4, favourites: 3, contactRate: 0.1 });
  });

  it('reports a zero rate rather than dividing by zero', () => {
    expect(inventoryTotals([row({ listing_id: 'a' })]).contactRate).toBe(0);
    expect(inventoryTotals([]).contactRate).toBe(0);
  });
});

describe('rankByDemand', () => {
  it('puts contacts first, then views, then favourites', () => {
    const ranked = rankByDemand([
      row({ listing_id: 'few-views', contacts: 1, views: 5 }),
      row({ listing_id: 'popular', contacts: 4, views: 2 }),
      row({ listing_id: 'many-views', contacts: 1, views: 90 }),
      row({ listing_id: 'quiet', favourites: 9 }),
    ]);

    expect(ranked.map((r) => r.listing_id)).toEqual(['popular', 'many-views', 'few-views', 'quiet']);
  });

  it('does not mutate the input', () => {
    const rows = [row({ listing_id: 'a' }), row({ listing_id: 'b', contacts: 5 })];
    rankByDemand(rows);
    expect(rows.map((r) => r.listing_id)).toEqual(['a', 'b']);
  });
});

describe('inventoryAttention', () => {
  it('flags well-seen vehicles that nobody contacts', () => {
    const { ignored, invisible } = inventoryAttention([
      row({ listing_id: 'overpriced', views: 40 }),
      row({ listing_id: 'working', views: 40, contacts: 2 }),
    ]);

    expect(ignored.map((r) => r.listing_id)).toEqual(['overpriced']);
    expect(invisible).toEqual([]);
  });

  it('separates barely-seen vehicles as a visibility problem', () => {
    const { ignored, invisible } = inventoryAttention([
      row({ listing_id: 'unseen', views: 1 }),
      row({ listing_id: 'seen-not-wanted', views: 25 }),
    ]);

    expect(ignored.map((r) => r.listing_id)).toEqual(['seen-not-wanted']);
    expect(invisible.map((r) => r.listing_id)).toEqual(['unseen']);
  });

  it('never flags a vehicle that is getting contacts', () => {
    const { ignored, invisible } = inventoryAttention([
      row({ listing_id: 'low-views-but-contacted', views: 2, contacts: 1 }),
    ]);

    expect(ignored).toEqual([]);
    expect(invisible).toEqual([]);
  });

  it('honours a custom minViews threshold', () => {
    const rows = [row({ listing_id: 'a', views: 6 })];
    expect(inventoryAttention(rows, { minViews: 5 }).ignored).toHaveLength(1);
    expect(inventoryAttention(rows, { minViews: 20 }).invisible).toHaveLength(1);
  });

  it('orders ignored by most views and invisible by fewest', () => {
    const { ignored, invisible } = inventoryAttention([
      row({ listing_id: 'ignored-low', views: 12 }),
      row({ listing_id: 'ignored-high', views: 80 }),
      row({ listing_id: 'invisible-some', views: 4 }),
      row({ listing_id: 'invisible-none', views: 0 }),
    ]);

    expect(ignored.map((r) => r.listing_id)).toEqual(['ignored-high', 'ignored-low']);
    expect(invisible.map((r) => r.listing_id)).toEqual(['invisible-none', 'invisible-some']);
  });
});
