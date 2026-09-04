/**
 * Canonical query shaping for the public vehicle browse surface.
 *
 * Both `/listings` (server component) and `GET /api/listings` used to build this
 * query by hand, and both did it the same wrong way: vehicle-level filters were
 * resolved with a separate `select('id')` on `vehicles`, then fed back through
 * `.in('vehicle_id', ids)`. PostgREST caps an unbounded select at its configured
 * max rows (1000 by default), so once the catalogue outgrows that, matching
 * listings silently vanish from the results — and the surviving ids travel back
 * as a URL with a thousand UUIDs in it.
 *
 * `vehicles!inner(...)` expresses the same filter as one join, so there is no cap
 * and no second round trip.
 */

import type { FuelType, ConditionGrade } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const LISTINGS_PAGE_SIZE = 20;

/** The oldest model year the catalogue accepts, mirroring the vehicles check constraint. */
const MIN_YEAR = 1960;
const MAX_MILEAGE_KM = 2_000_000;
const MAX_PRICE_XAF = 1_000_000_000;

const FUEL_TYPES: readonly string[] = ['petrol', 'diesel', 'electric', 'hybrid', 'other'];
const CONDITION_GRADES: readonly string[] = ['A', 'B', 'C', 'D'];

export const LISTING_SORTS = ['newest', 'price_asc', 'price_desc', 'mileage'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

/**
 * Columns a listing card actually renders. `select('*')` pulled the verifier,
 * inspector and field-agent assignments, the MVE band bounds and the full
 * description into every card in the grid.
 *
 * `avg_rating` / `total_reviews` are on the seller embed because the card
 * renders a StarRating from them — reached through an `as unknown as {...}`
 * cast, which is why selecting only `is_verified` failed silently rather than
 * failing at compile time. The stars simply never appeared.
 */
export const LISTING_CARD_SELECT = `
  id, asking_price, price_band, zone, city, financeable, status, created_at, published_at,
  vehicle:vehicles!inner(id, make, model, year, mileage_km, fuel_type, transmission, condition_grade),
  media:media_assets(id),
  seller:profiles!seller_id(is_verified, avg_rating, total_reviews)
`;

/**
 * Columns the homepage/recommendation carousels render.
 *
 * Lives here rather than inline in `app/page.tsx` so it is covered by the same
 * regression tests as the card select. It has already lost a column once:
 * `financeable` was missing, so the green "F" badge never rendered — not even
 * on the financeable carousel, which filters on `financeable = true`.
 */
export const LISTING_CAROUSEL_SELECT =
  'id, asking_price, zone, price_band, financeable, ' +
  'vehicle:vehicles(make, model, year, mileage_km, fuel_type), media:media_assets(id)';

// ─── Params ───────────────────────────────────────────────────────────────────

export interface ListingSearchParams {
  zone?: string;
  make?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  maxYear?: number;
  maxMileage?: number;
  fuelType?: FuelType;
  conditionGrade?: ConditionGrade;
  financeable?: boolean;
  sort: ListingSort;
  page: number;
}

/** Raw `searchParams`, where every value is a string, an array, or absent. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(raw: RawSearchParams, key: string): string | undefined {
  const value = raw[key];
  const single = Array.isArray(value) ? value[0] : value;
  const trimmed = single?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * A finite integer inside `[min, max]`, or undefined.
 *
 * The hand-rolled versions passed `parseInt(...)` straight into `.gte()`. A
 * non-numeric `?min_year=abc` became the literal filter `year=gte.NaN`, which
 * PostgREST rejects — so one junk query parameter (a crawler following a mangled
 * link, say) emptied the whole page rather than being ignored.
 */
function intInRange(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.trunc(parsed);
  if (rounded < min || rounded > max) return undefined;
  return rounded;
}

function numberInRange(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly string[]): T | undefined {
  return value !== undefined && allowed.includes(value) ? (value as T) : undefined;
}

/**
 * Strip the characters PostgREST treats as filter syntax.
 *
 * `ilike('vehicle.make', '%' + make + '%')` is interpolated into a query string
 * as `vehicle.make=ilike.%Toyota%`. A comma in the value splits the filter list
 * and a parenthesis opens a logic group, so an unsanitised search for
 * `Toyota, Honda` produces a malformed request rather than an empty result. The
 * wildcards are dropped too, so a user cannot widen their own pattern.
 */
export function sanitiseIlikeTerm(term: string): string {
  return term.replace(/[,.()%*\\"']/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseListingSearch(raw: RawSearchParams): ListingSearchParams {
  const currentYear = new Date().getUTCFullYear();
  const make = first(raw, 'make');
  const model = first(raw, 'model');

  const minPrice = numberInRange(first(raw, 'min_price'), 0, MAX_PRICE_XAF);
  const maxPrice = numberInRange(first(raw, 'max_price'), 0, MAX_PRICE_XAF);
  const minYear = intInRange(first(raw, 'min_year'), MIN_YEAR, currentYear + 1);
  const maxYear = intInRange(first(raw, 'max_year'), MIN_YEAR, currentYear + 1);
  const bothPrices = minPrice !== undefined && maxPrice !== undefined;
  const bothYears = minYear !== undefined && maxYear !== undefined;

  return {
    zone: first(raw, 'zone'),
    make: make ? sanitiseIlikeTerm(make) || undefined : undefined,
    model: model ? sanitiseIlikeTerm(model) || undefined : undefined,
    // An inverted range matches nothing at all; read it in the order the user
    // plainly meant instead of handing them an empty grid.
    minPrice: bothPrices ? Math.min(minPrice!, maxPrice!) : minPrice,
    maxPrice: bothPrices ? Math.max(minPrice!, maxPrice!) : maxPrice,
    minYear: bothYears ? Math.min(minYear!, maxYear!) : minYear,
    maxYear: bothYears ? Math.max(minYear!, maxYear!) : maxYear,
    maxMileage: intInRange(first(raw, 'max_mileage'), 0, MAX_MILEAGE_KM),
    fuelType: oneOf<FuelType>(first(raw, 'fuel_type'), FUEL_TYPES),
    conditionGrade: oneOf<ConditionGrade>(first(raw, 'condition_grade'), CONDITION_GRADES),
    financeable: first(raw, 'financeable') === 'true' ? true : undefined,
    sort: oneOf<ListingSort>(first(raw, 'sort'), LISTING_SORTS) ?? 'newest',
    page: intInRange(first(raw, 'page'), 1, 10_000) ?? 1,
  };
}

export function listingRange(page: number, pageSize = LISTINGS_PAGE_SIZE): [number, number] {
  const offset = (page - 1) * pageSize;
  return [offset, offset + pageSize - 1];
}

// ─── Query shaping ────────────────────────────────────────────────────────────

export interface OrderOptions {
  ascending?: boolean;
  nullsFirst?: boolean;
  referencedTable?: string;
}

/** The slice of the Supabase builder this module drives. */
export interface ListingQuery {
  eq(column: string, value: unknown): ListingQuery;
  gte(column: string, value: unknown): ListingQuery;
  lte(column: string, value: unknown): ListingQuery;
  ilike(column: string, pattern: string): ListingQuery;
  order(column: string, options?: OrderOptions): ListingQuery;
  limit(count: number, options?: { referencedTable?: string }): ListingQuery;
}

export interface ShapeOptions {
  /**
   * How many media rows to embed per listing. A card renders exactly one
   * thumbnail, so the grid does not need the other twenty photos of each car.
   */
  mediaLimit?: number;
  /**
   * Path to the media embed. `favourites` reaches it one level down, as
   * `listing.media`, so its filters and ordering need the fully qualified path.
   */
  mediaPath?: string;
}

/**
 * Order the embedded media so the *primary* photo is `media[0]`.
 *
 * The cards read `listing.media[0].id` while the query asked for
 * `media_assets(*)` with no ordering, so the thumbnail was whichever row the
 * database happened to return first — and since videos live in the same table,
 * that could be a video id, which the thumbnail endpoint cannot render.
 */
export function shapeListingMedia<Q extends ListingQuery>(query: Q, options: ShapeOptions = {}): Q {
  // A filter on a non-inner embed narrows the embedded array only: a listing
  // with no photos still comes back, with `media: []`, and renders the
  // "pas de photo" placeholder.
  const path = options.mediaPath ?? 'media';
  let q = query.eq(`${path}.asset_type`, 'photo') as Q;
  q = q.order('display_order', { referencedTable: path, ascending: true }) as Q;
  if (options.mediaLimit !== undefined) {
    q = q.limit(options.mediaLimit, { referencedTable: path }) as Q;
  }
  return q;
}

/** Apply every browse filter and the sort to an already-scoped listings query. */
export function applyListingSearch<Q extends ListingQuery>(
  query: Q,
  params: ListingSearchParams,
  options: ShapeOptions = {}
): Q {
  let q = query;

  if (params.zone !== undefined) q = q.eq('zone', params.zone) as Q;
  if (params.minPrice !== undefined) q = q.gte('asking_price', params.minPrice) as Q;
  if (params.maxPrice !== undefined) q = q.lte('asking_price', params.maxPrice) as Q;
  if (params.financeable) q = q.eq('financeable', true) as Q;

  // Vehicle-level filters ride the inner join rather than a pre-resolved id list.
  if (params.make !== undefined) q = q.ilike('vehicle.make', `%${params.make}%`) as Q;
  if (params.model !== undefined) q = q.ilike('vehicle.model', `%${params.model}%`) as Q;
  if (params.minYear !== undefined) q = q.gte('vehicle.year', params.minYear) as Q;
  if (params.maxYear !== undefined) q = q.lte('vehicle.year', params.maxYear) as Q;
  if (params.maxMileage !== undefined) q = q.lte('vehicle.mileage_km', params.maxMileage) as Q;
  if (params.fuelType !== undefined) q = q.eq('vehicle.fuel_type', params.fuelType) as Q;
  if (params.conditionGrade !== undefined) q = q.eq('vehicle.condition_grade', params.conditionGrade) as Q;

  q = shapeListingMedia(q, options);
  return applyListingSort(q, params.sort);
}

/**
 * PostgREST can only order parent rows by parent columns — ordering on an
 * embedded resource sorts the embedded array, not the listings. `sort=mileage`
 * therefore fell through to `created_at` and quietly returned newest-first while
 * the control still read "Kilométrage le plus bas". Migration 034 denormalises
 * the mileage onto `listings.vehicle_mileage_km` (trigger-maintained) so the
 * sort the UI offers is the sort the user gets.
 */
export function applyListingSort<Q extends ListingQuery>(query: Q, sort: ListingSort): Q {
  switch (sort) {
    case 'price_asc':
      return query.order('asking_price', { ascending: true }) as Q;
    case 'price_desc':
      return query.order('asking_price', { ascending: false }) as Q;
    case 'mileage':
      return query.order('vehicle_mileage_km', { ascending: true, nullsFirst: false }) as Q;
    case 'newest':
    default:
      return query.order('created_at', { ascending: false }) as Q;
  }
}
