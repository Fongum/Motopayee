/**
 * Canonical query shaping for the public rental browse surface.
 *
 * Sibling of `listing-query.ts`, and it exists for the same reason: `/hire` and
 * `GET /api/hire` each hand-rolled this query, and the two had already drifted —
 * the API grew `transmission`, `min_seats` and `available` filters that the page
 * never got, so the same URL parameters worked against one surface and were
 * ignored by the other.
 */

import { sanitiseIlikeTerm } from './listing-query';

export { sanitiseIlikeTerm };

// ─── Constants ────────────────────────────────────────────────────────────────

export const HIRE_PAGE_SIZE = 20;

const MAX_DAILY_RATE_XAF = 100_000_000;
const MAX_SEATS = 100;

const FUEL_TYPES: readonly string[] = ['petrol', 'diesel', 'electric', 'hybrid', 'other'];
const TRANSMISSIONS: readonly string[] = ['manual', 'automatic', 'other'];
const HIRE_TYPES: readonly string[] = ['self_drive', 'with_driver', 'both'];
const ZONES: readonly string[] = ['A', 'B', 'C'];

export const HIRE_SORTS = ['newest', 'price_asc', 'price_desc'] as const;
export type HireSort = (typeof HIRE_SORTS)[number];

/**
 * Columns a rental card renders.
 *
 * Two things this fixes beyond the payload size:
 *
 *  - `owner:profiles!owner_id(..., phone)` shipped every owner's phone number to
 *    anyone who loaded the grid or called the public endpoint. The card never
 *    renders it — only the detail page does, deliberately, as a contact button —
 *    so it was pure leakage, twenty numbers at a time, scrapeable by page.
 *  - The card reads `owner.avg_rating` / `owner.total_reviews` through a cast,
 *    but neither column was ever selected, so the star rating silently never
 *    appeared. The cast is what hid it. They are selected now.
 */
export const HIRE_CARD_SELECT = `
  id, make, model, year, fuel_type, transmission, seats, hire_type,
  daily_rate, weekly_rate, city, zone, insurance_included, availability, status, created_at,
  owner:profiles!owner_id(full_name, is_verified, avg_rating, total_reviews),
  media:hire_listing_media(id, storage_path, bucket, display_order)
`;

// ─── Params ───────────────────────────────────────────────────────────────────

export interface HireSearchParams {
  city?: string;
  zone?: string;
  make?: string;
  hireType?: string;
  minPrice?: number;
  maxPrice?: number;
  fuelType?: string;
  transmission?: string;
  minSeats?: number;
  availableOnly?: boolean;
  sort: HireSort;
  page: number;
}

export type RawHireParams = Record<string, string | string[] | undefined>;

function first(raw: RawHireParams, key: string): string | undefined {
  const value = raw[key];
  const single = Array.isArray(value) ? value[0] : value;
  const trimmed = single?.trim();
  return trimmed ? trimmed : undefined;
}

/** See listing-query: an unchecked `parseInt` reaches PostgREST as `gte.NaN`, a 400. */
function intInRange(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.trunc(parsed);
  if (rounded < min || rounded > max) return undefined;
  return rounded;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly string[]): T | undefined {
  return value !== undefined && allowed.includes(value) ? (value as T) : undefined;
}

function term(raw: RawHireParams, key: string): string | undefined {
  const value = first(raw, key);
  if (value === undefined) return undefined;
  return sanitiseIlikeTerm(value) || undefined;
}

export function parseHireSearch(raw: RawHireParams): HireSearchParams {
  const minPrice = intInRange(first(raw, 'min_price'), 0, MAX_DAILY_RATE_XAF);
  const maxPrice = intInRange(first(raw, 'max_price'), 0, MAX_DAILY_RATE_XAF);
  const bothPrices = minPrice !== undefined && maxPrice !== undefined;

  return {
    city: term(raw, 'city'),
    make: term(raw, 'make'),
    zone: oneOf(first(raw, 'zone'), ZONES),
    hireType: oneOf(first(raw, 'hire_type'), HIRE_TYPES),
    // An inverted range matches nothing; read it the way the user meant it.
    minPrice: bothPrices ? Math.min(minPrice!, maxPrice!) : minPrice,
    maxPrice: bothPrices ? Math.max(minPrice!, maxPrice!) : maxPrice,
    fuelType: oneOf(first(raw, 'fuel_type'), FUEL_TYPES),
    transmission: oneOf(first(raw, 'transmission'), TRANSMISSIONS),
    minSeats: intInRange(first(raw, 'min_seats'), 1, MAX_SEATS),
    availableOnly: first(raw, 'available') === 'true' ? true : undefined,
    sort: oneOf<HireSort>(first(raw, 'sort'), HIRE_SORTS) ?? 'newest',
    page: intInRange(first(raw, 'page'), 1, 10_000) ?? 1,
  };
}

export function hireRange(page: number, pageSize = HIRE_PAGE_SIZE): [number, number] {
  const offset = (page - 1) * pageSize;
  return [offset, offset + pageSize - 1];
}

// ─── Query shaping ────────────────────────────────────────────────────────────

export interface HireQuery {
  eq(column: string, value: unknown): HireQuery;
  gte(column: string, value: unknown): HireQuery;
  lte(column: string, value: unknown): HireQuery;
  in(column: string, values: readonly unknown[]): HireQuery;
  ilike(column: string, pattern: string): HireQuery;
  order(column: string, options?: { ascending?: boolean; referencedTable?: string }): HireQuery;
}

/**
 * Order the photo embed.
 *
 * The card takes `media[0].storage_path` as its cover image from an unordered
 * `hire_listing_media(*)`, so the cover was an arbitrary row — and videos share
 * the table, so it could be a video path handed to an <img>. Unlike the sale
 * cards this embed is *not* limited to one row: the card also renders a photo
 * count badge from `media.length`, which a limit of 1 would peg to "1".
 */
export function shapeHireMedia<Q extends HireQuery>(query: Q): Q {
  const q = query.eq('media.asset_type', 'photo') as Q;
  return q.order('display_order', { referencedTable: 'media', ascending: true }) as Q;
}

export function applyHireSearch<Q extends HireQuery>(query: Q, params: HireSearchParams): Q {
  let q = query;

  if (params.city !== undefined) q = q.ilike('city', `%${params.city}%`) as Q;
  if (params.make !== undefined) q = q.ilike('make', `%${params.make}%`) as Q;
  if (params.zone !== undefined) q = q.eq('zone', params.zone) as Q;
  // "with_driver" vehicles also satisfy a "both" listing, and vice versa.
  if (params.hireType !== undefined) q = q.in('hire_type', [params.hireType, 'both']) as Q;
  if (params.minPrice !== undefined) q = q.gte('daily_rate', params.minPrice) as Q;
  if (params.maxPrice !== undefined) q = q.lte('daily_rate', params.maxPrice) as Q;
  if (params.fuelType !== undefined) q = q.eq('fuel_type', params.fuelType) as Q;
  if (params.transmission !== undefined) q = q.eq('transmission', params.transmission) as Q;
  if (params.minSeats !== undefined) q = q.gte('seats', params.minSeats) as Q;
  if (params.availableOnly) q = q.eq('availability', 'available') as Q;

  q = shapeHireMedia(q);
  return applyHireSort(q, params.sort);
}

export function applyHireSort<Q extends HireQuery>(query: Q, sort: HireSort): Q {
  switch (sort) {
    case 'price_asc':
      return query.order('daily_rate', { ascending: true }) as Q;
    case 'price_desc':
      return query.order('daily_rate', { ascending: false }) as Q;
    case 'newest':
    default:
      return query.order('created_at', { ascending: false }) as Q;
  }
}
