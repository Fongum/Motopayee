import { describe, it, expect } from 'vitest';
import {
  LISTINGS_PAGE_SIZE,
  LISTING_CARD_SELECT,
  LISTING_CAROUSEL_SELECT,
  applyListingSearch,
  applyListingSort,
  listingRange,
  parseListingSearch,
  sanitiseIlikeTerm,
  shapeListingMedia,
} from './listing-query';
import type { ListingQuery, OrderOptions } from './listing-query';

// ─── Recording fake ───────────────────────────────────────────────────────────

type Call =
  | { fn: 'eq' | 'gte' | 'lte'; column: string; value: unknown }
  | { fn: 'ilike'; column: string; value: string }
  | { fn: 'order'; column: string; options?: OrderOptions }
  | { fn: 'limit'; count: number; options?: { referencedTable?: string } };

/** Stands in for the Supabase builder, recording the chain instead of issuing it. */
function recorder(): ListingQuery & { calls: Call[] } {
  const calls: Call[] = [];
  const self = {
    calls,
    eq(column: string, value: unknown) { calls.push({ fn: 'eq', column, value }); return self; },
    gte(column: string, value: unknown) { calls.push({ fn: 'gte', column, value }); return self; },
    lte(column: string, value: unknown) { calls.push({ fn: 'lte', column, value }); return self; },
    ilike(column: string, value: string) { calls.push({ fn: 'ilike', column, value }); return self; },
    order(column: string, options?: OrderOptions) { calls.push({ fn: 'order', column, options }); return self; },
    limit(count: number, options?: { referencedTable?: string }) { calls.push({ fn: 'limit', count, options }); return self; },
  };
  return self;
}

function columns(calls: Call[]): string[] {
  return calls.map((c) => ('column' in c ? c.column : `limit:${c.options?.referencedTable ?? 'root'}`));
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

describe('parseListingSearch', () => {
  it('defaults to the first page sorted newest-first', () => {
    const params = parseListingSearch({});
    expect(params.page).toBe(1);
    expect(params.sort).toBe('newest');
    expect(params.zone).toBeUndefined();
  });

  it('drops non-numeric filters instead of forwarding NaN to the database', () => {
    // `year=gte.NaN` is a 400 from PostgREST, which emptied the entire grid.
    const params = parseListingSearch({
      min_year: 'abc',
      max_mileage: '',
      min_price: 'null',
      page: 'undefined',
    });
    expect(params.minYear).toBeUndefined();
    expect(params.maxMileage).toBeUndefined();
    expect(params.minPrice).toBeUndefined();
    expect(params.page).toBe(1);
  });

  it('rejects out-of-range and negative numbers', () => {
    const params = parseListingSearch({ min_year: '1200', max_mileage: '-5', page: '0' });
    expect(params.minYear).toBeUndefined();
    expect(params.maxMileage).toBeUndefined();
    expect(params.page).toBe(1);
  });

  it('reads an inverted range the way the user meant it', () => {
    const params = parseListingSearch({ min_price: '9000000', max_price: '2000000' });
    expect(params.minPrice).toBe(2_000_000);
    expect(params.maxPrice).toBe(9_000_000);
  });

  it('rejects a sort or enum it does not recognise', () => {
    const params = parseListingSearch({ sort: 'cheapest', fuel_type: 'plutonium', condition_grade: 'Z' });
    expect(params.sort).toBe('newest');
    expect(params.fuelType).toBeUndefined();
    expect(params.conditionGrade).toBeUndefined();
  });

  it('keeps the sorts and enums it does recognise', () => {
    const params = parseListingSearch({ sort: 'mileage', fuel_type: 'diesel', condition_grade: 'B', financeable: 'true' });
    expect(params.sort).toBe('mileage');
    expect(params.fuelType).toBe('diesel');
    expect(params.conditionGrade).toBe('B');
    expect(params.financeable).toBe(true);
  });

  it('treats financeable as opt-in only, never as an exclusion', () => {
    // `financeable=false` must widen back to everything, not filter to cash-only.
    expect(parseListingSearch({ financeable: 'false' }).financeable).toBeUndefined();
  });

  it('takes the first value when a parameter repeats, and ignores blanks', () => {
    const params = parseListingSearch({ zone: ['littoral', 'centre'], make: '   ' });
    expect(params.zone).toBe('littoral');
    expect(params.make).toBeUndefined();
  });
});

describe('sanitiseIlikeTerm', () => {
  it('removes the characters PostgREST reads as filter syntax', () => {
    expect(sanitiseIlikeTerm('Toyota, Honda')).toBe('Toyota Honda');
    expect(sanitiseIlikeTerm('or(a,b)')).toBe('or a b');
  });

  it('strips wildcards so a search cannot widen its own pattern', () => {
    expect(sanitiseIlikeTerm('%%%')).toBe('');
    expect(sanitiseIlikeTerm('Toy*ta')).toBe('Toy ta');
  });

  it('leaves an ordinary make untouched', () => {
    expect(sanitiseIlikeTerm('Land Cruiser')).toBe('Land Cruiser');
  });
});

describe('listingRange', () => {
  it('maps pages onto inclusive ranges', () => {
    expect(listingRange(1)).toEqual([0, LISTINGS_PAGE_SIZE - 1]);
    expect(listingRange(3)).toEqual([2 * LISTINGS_PAGE_SIZE, 3 * LISTINGS_PAGE_SIZE - 1]);
  });
});

// ─── Query shaping ────────────────────────────────────────────────────────────

describe('LISTING_CARD_SELECT', () => {
  it('joins the vehicle inner so vehicle filters need no second query', () => {
    expect(LISTING_CARD_SELECT).toContain('vehicles!inner');
  });

  it('names its columns rather than selecting everything', () => {
    expect(LISTING_CARD_SELECT).not.toContain('*');
  });

  it('selects the seller rating columns the card renders', () => {
    // ListingCard renders a StarRating from seller.avg_rating / total_reviews.
    // Selecting only `is_verified` left them undefined and the stars never
    // rendered — silently, because an `as unknown as {...}` cast stood between
    // the component and the type that would have caught it.
    expect(LISTING_CARD_SELECT).toContain('avg_rating');
    expect(LISTING_CARD_SELECT).toContain('total_reviews');
  });

  it('does not expose the internal staff assignments on a public card', () => {
    for (const column of ['field_agent_id', 'inspector_id', 'verifier_id', 'mve_low', 'mve_high']) {
      expect(LISTING_CARD_SELECT).not.toContain(column);
    }
  });
});

describe('LISTING_CAROUSEL_SELECT', () => {
  it('selects financeable, which the carousel renders as its "F" badge', () => {
    // This column was missing, so the badge never appeared — not even on the
    // financeable carousel, whose query filters on `financeable = true`. No cast
    // was involved: the field is legitimately on the Listing type, the select
    // just omitted it, so nothing could catch it but the eye.
    expect(LISTING_CAROUSEL_SELECT).toContain('financeable');
  });

  it('carries every other field the carousel renders', () => {
    for (const column of ['id', 'asking_price', 'zone', 'price_band', 'make', 'model', 'year']) {
      expect(LISTING_CAROUSEL_SELECT).toContain(column);
    }
  });

  it('names its columns rather than selecting everything', () => {
    expect(LISTING_CAROUSEL_SELECT).not.toContain('*');
  });
});

describe('applyListingSearch', () => {
  it('sends vehicle filters through the join, not a pre-resolved id list', () => {
    const q = recorder();
    applyListingSearch(q, parseListingSearch({ make: 'Toyota', min_year: '2015', fuel_type: 'diesel' }));

    expect(q.calls).toContainEqual({ fn: 'ilike', column: 'vehicle.make', value: '%Toyota%' });
    expect(q.calls).toContainEqual({ fn: 'gte', column: 'vehicle.year', value: 2015 });
    expect(q.calls).toContainEqual({ fn: 'eq', column: 'vehicle.fuel_type', value: 'diesel' });
    expect(columns(q.calls)).not.toContain('vehicle_id');
  });

  it('applies only the filters that were supplied', () => {
    const q = recorder();
    applyListingSearch(q, parseListingSearch({ zone: 'littoral' }));

    const filtered = columns(q.calls);
    expect(filtered).toContain('zone');
    expect(filtered).not.toContain('asking_price');
    expect(filtered).not.toContain('vehicle.make');
    expect(filtered).not.toContain('financeable');
  });

  it('carries the price bounds through', () => {
    const q = recorder();
    applyListingSearch(q, parseListingSearch({ min_price: '1000000', max_price: '5000000' }));

    expect(q.calls).toContainEqual({ fn: 'gte', column: 'asking_price', value: 1_000_000 });
    expect(q.calls).toContainEqual({ fn: 'lte', column: 'asking_price', value: 5_000_000 });
  });
});

describe('shapeListingMedia', () => {
  it('orders the embed so media[0] is the primary photo, never an arbitrary row', () => {
    const q = recorder();
    shapeListingMedia(q);

    const order = q.calls.find((c) => c.fn === 'order');
    expect(order).toEqual({
      fn: 'order',
      column: 'display_order',
      options: { referencedTable: 'media', ascending: true },
    });
  });

  it('excludes videos, which the card cannot render as a thumbnail', () => {
    const q = recorder();
    shapeListingMedia(q);
    expect(q.calls).toContainEqual({ fn: 'eq', column: 'media.asset_type', value: 'photo' });
  });

  it('limits the embed to the requested number of photos, scoped to the embed', () => {
    const q = recorder();
    shapeListingMedia(q, { mediaLimit: 1 });

    expect(q.calls).toContainEqual({ fn: 'limit', count: 1, options: { referencedTable: 'media' } });
  });

  it('leaves the embed unbounded when no limit is asked for', () => {
    // The detail-page gallery wants every photo, in the seller's chosen order.
    const q = recorder();
    shapeListingMedia(q);
    expect(q.calls.some((c) => c.fn === 'limit')).toBe(false);
  });

  it('qualifies the path when the embed is nested, as it is under favourites', () => {
    const q = recorder();
    shapeListingMedia(q, { mediaLimit: 1, mediaPath: 'listing.media' });

    expect(q.calls).toEqual([
      { fn: 'eq', column: 'listing.media.asset_type', value: 'photo' },
      { fn: 'order', column: 'display_order', options: { referencedTable: 'listing.media', ascending: true } },
      { fn: 'limit', count: 1, options: { referencedTable: 'listing.media' } },
    ]);
  });
});

describe('applyListingSort', () => {
  it('sorts by mileage on the denormalised column, not silently by date', () => {
    const q = recorder();
    applyListingSort(q, 'mileage');

    // Ordering an embedded resource sorts the embed, not the listings — which is
    // why this column exists on `listings` at all (migration 034).
    expect(q.calls).toEqual([
      { fn: 'order', column: 'vehicle_mileage_km', options: { ascending: true, nullsFirst: false } },
    ]);
  });

  it('sorts by price in both directions', () => {
    const asc = recorder();
    applyListingSort(asc, 'price_asc');
    expect(asc.calls).toEqual([{ fn: 'order', column: 'asking_price', options: { ascending: true } }]);

    const desc = recorder();
    applyListingSort(desc, 'price_desc');
    expect(desc.calls).toEqual([{ fn: 'order', column: 'asking_price', options: { ascending: false } }]);
  });

  it('defaults to newest first', () => {
    const q = recorder();
    applyListingSort(q, 'newest');
    expect(q.calls).toEqual([{ fn: 'order', column: 'created_at', options: { ascending: false } }]);
  });

  it('offers exactly the sorts the filter control lists', () => {
    // SORTS in app/listings/SearchFilters.tsx — the two must not drift.
    for (const sort of ['newest', 'price_asc', 'price_desc', 'mileage'] as const) {
      expect(parseListingSearch({ sort }).sort).toBe(sort);
    }
  });
});
