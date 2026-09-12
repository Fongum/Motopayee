import { describe, it, expect } from 'vitest';
import {
  HIRE_CARD_SELECT,
  HIRE_PAGE_SIZE,
  applyHireSearch,
  applyHireSort,
  hireRange,
  parseHireSearch,
  shapeHireMedia,
} from './hire-query';
import type { HireQuery } from './hire-query';

// ─── Recording fake ───────────────────────────────────────────────────────────

type Call =
  | { fn: 'eq' | 'gte' | 'lte'; column: string; value: unknown }
  | { fn: 'in'; column: string; value: readonly unknown[] }
  | { fn: 'ilike'; column: string; value: string }
  | { fn: 'order'; column: string; options?: { ascending?: boolean; referencedTable?: string } };

function recorder(): HireQuery & { calls: Call[] } {
  const calls: Call[] = [];
  const self = {
    calls,
    eq(column: string, value: unknown) { calls.push({ fn: 'eq', column, value }); return self; },
    gte(column: string, value: unknown) { calls.push({ fn: 'gte', column, value }); return self; },
    lte(column: string, value: unknown) { calls.push({ fn: 'lte', column, value }); return self; },
    in(column: string, value: readonly unknown[]) { calls.push({ fn: 'in', column, value }); return self; },
    ilike(column: string, value: string) { calls.push({ fn: 'ilike', column, value }); return self; },
    order(column: string, options?: { ascending?: boolean; referencedTable?: string }) {
      calls.push({ fn: 'order', column, options });
      return self;
    },
  };
  return self;
}

function columns(calls: Call[]): string[] {
  return calls.map((c) => c.column);
}

// ─── The card select ──────────────────────────────────────────────────────────

describe('HIRE_CARD_SELECT', () => {
  it("never ships the owner's phone number to the public grid", () => {
    // The card has no phone UI; only /hire/[id] shows it, as a contact button.
    // Selecting it here handed out twenty numbers per page to anyone, including
    // unauthenticated callers of GET /api/hire.
    expect(HIRE_CARD_SELECT).not.toContain('phone');
  });

  it('selects the rating columns the card actually renders', () => {
    // HireCard reads owner.avg_rating / owner.total_reviews through a cast, so
    // omitting them from the select failed silently: the stars never appeared.
    expect(HIRE_CARD_SELECT).toContain('avg_rating');
    expect(HIRE_CARD_SELECT).toContain('total_reviews');
  });

  it('names its columns rather than selecting everything', () => {
    expect(HIRE_CARD_SELECT).not.toContain('*');
  });

  it('carries every field the card renders', () => {
    for (const column of [
      'make', 'model', 'year', 'fuel_type', 'transmission', 'seats', 'hire_type',
      'daily_rate', 'weekly_rate', 'city', 'zone', 'insurance_included', 'availability', 'status',
    ]) {
      expect(HIRE_CARD_SELECT).toContain(column);
    }
  });
});

// ─── Parsing ──────────────────────────────────────────────────────────────────

describe('parseHireSearch', () => {
  it('defaults to the first page, newest first', () => {
    const params = parseHireSearch({});
    expect(params.page).toBe(1);
    expect(params.sort).toBe('newest');
  });

  it('drops non-numeric prices instead of forwarding NaN to the database', () => {
    const params = parseHireSearch({ min_price: 'abc', max_price: '', min_seats: 'five' });
    expect(params.minPrice).toBeUndefined();
    expect(params.maxPrice).toBeUndefined();
    expect(params.minSeats).toBeUndefined();
  });

  it('reads an inverted price range the way the user meant it', () => {
    const params = parseHireSearch({ min_price: '50000', max_price: '10000' });
    expect(params.minPrice).toBe(10_000);
    expect(params.maxPrice).toBe(50_000);
  });

  it('rejects enum values the database would reject', () => {
    const params = parseHireSearch({
      zone: 'D',
      fuel_type: 'coal',
      transmission: 'cvt',
      hire_type: 'chauffeur',
      sort: 'cheapest',
    });
    expect(params.zone).toBeUndefined();
    expect(params.fuelType).toBeUndefined();
    expect(params.transmission).toBeUndefined();
    expect(params.hireType).toBeUndefined();
    expect(params.sort).toBe('newest');
  });

  it('keeps the enum values the database accepts', () => {
    const params = parseHireSearch({
      zone: 'B',
      fuel_type: 'diesel',
      transmission: 'automatic',
      hire_type: 'with_driver',
      sort: 'price_asc',
      available: 'true',
    });
    expect(params.zone).toBe('B');
    expect(params.fuelType).toBe('diesel');
    expect(params.transmission).toBe('automatic');
    expect(params.hireType).toBe('with_driver');
    expect(params.sort).toBe('price_asc');
    expect(params.availableOnly).toBe(true);
  });

  it('treats available as opt-in only, never as an exclusion', () => {
    expect(parseHireSearch({ available: 'false' }).availableOnly).toBeUndefined();
  });

  it('sanitises the free-text terms that reach an ilike filter', () => {
    expect(parseHireSearch({ city: 'Douala, Bonapriso' }).city).toBe('Douala Bonapriso');
    expect(parseHireSearch({ make: '%%%' }).make).toBeUndefined();
  });
});

describe('hireRange', () => {
  it('maps pages onto inclusive ranges', () => {
    expect(hireRange(1)).toEqual([0, HIRE_PAGE_SIZE - 1]);
    expect(hireRange(2)).toEqual([HIRE_PAGE_SIZE, 2 * HIRE_PAGE_SIZE - 1]);
  });
});

// ─── Query shaping ────────────────────────────────────────────────────────────

describe('applyHireSearch', () => {
  it('applies only the filters that were supplied', () => {
    const q = recorder();
    applyHireSearch(q, parseHireSearch({ city: 'Douala' }));

    const applied = columns(q.calls);
    expect(applied).toContain('city');
    expect(applied).not.toContain('daily_rate');
    expect(applied).not.toContain('availability');
    expect(applied).not.toContain('seats');
  });

  it('matches a driver preference against listings offering both', () => {
    const q = recorder();
    applyHireSearch(q, parseHireSearch({ hire_type: 'with_driver' }));

    expect(q.calls).toContainEqual({ fn: 'in', column: 'hire_type', value: ['with_driver', 'both'] });
  });

  it('honours the filters that previously existed only on the API route', () => {
    // transmission / min_seats / available were accepted by GET /api/hire and
    // silently ignored by the page; one module now serves both.
    const q = recorder();
    applyHireSearch(q, parseHireSearch({ transmission: 'automatic', min_seats: '7', available: 'true' }));

    expect(q.calls).toContainEqual({ fn: 'eq', column: 'transmission', value: 'automatic' });
    expect(q.calls).toContainEqual({ fn: 'gte', column: 'seats', value: 7 });
    expect(q.calls).toContainEqual({ fn: 'eq', column: 'availability', value: 'available' });
  });

  it('carries the daily-rate bounds through', () => {
    const q = recorder();
    applyHireSearch(q, parseHireSearch({ min_price: '15000', max_price: '80000' }));

    expect(q.calls).toContainEqual({ fn: 'gte', column: 'daily_rate', value: 15_000 });
    expect(q.calls).toContainEqual({ fn: 'lte', column: 'daily_rate', value: 80_000 });
  });
});

describe('shapeHireMedia', () => {
  it('orders the embed so media[0] is the cover photo', () => {
    const q = recorder();
    shapeHireMedia(q);

    expect(q.calls).toContainEqual({
      fn: 'order',
      column: 'display_order',
      options: { referencedTable: 'media', ascending: true },
    });
  });

  it('excludes videos, which cannot be rendered as a cover image', () => {
    const q = recorder();
    shapeHireMedia(q);
    expect(q.calls).toContainEqual({ fn: 'eq', column: 'media.asset_type', value: 'photo' });
  });

  it('leaves the embed unlimited so the photo-count badge stays truthful', () => {
    // The card renders `media.length` as "N photos"; a limit of 1 would peg it.
    const q = recorder();
    shapeHireMedia(q);
    expect(q.calls.some((c) => c.fn === 'order' && c.options?.referencedTable === 'media')).toBe(true);
    expect(q.calls).toHaveLength(2);
  });
});

describe('applyHireSort', () => {
  it('sorts by daily rate in both directions', () => {
    const asc = recorder();
    applyHireSort(asc, 'price_asc');
    expect(asc.calls).toEqual([{ fn: 'order', column: 'daily_rate', options: { ascending: true } }]);

    const desc = recorder();
    applyHireSort(desc, 'price_desc');
    expect(desc.calls).toEqual([{ fn: 'order', column: 'daily_rate', options: { ascending: false } }]);
  });

  it('defaults to newest first', () => {
    const q = recorder();
    applyHireSort(q, 'newest');
    expect(q.calls).toEqual([{ fn: 'order', column: 'created_at', options: { ascending: false } }]);
  });
});
