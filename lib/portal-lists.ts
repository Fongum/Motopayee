/**
 * How many rows a buyer- or seller-facing portal list renders.
 *
 * These lists are scoped to one user, so most of them will never approach a
 * limit of any kind — a buyer does not accumulate a thousand favourites. Two
 * can: a dealer's inventory and a busy inbox.
 *
 * The cap matters less than it being *explicit*. Unbounded does not mean
 * unlimited: PostgREST stops at db-max-rows and returns a short page with no
 * error, so the difference between a deliberate cap and an accidental one is
 * whether anyone can tell it happened.
 */
export const PORTAL_LIST_LIMIT = 200;
