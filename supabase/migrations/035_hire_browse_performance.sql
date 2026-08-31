-- ============================================================
-- Migration 035 — Rental browse performance
--
-- The /hire grid filters on status='published' and then sorts, exactly like the
-- sale grid did before migration 034. `idx_hire_listings_status` is a plain
-- single-column index, so it can narrow but never order: every page read the
-- whole published set and sorted it.
--
-- The photo embed is now ordered by display_order (the card takes media[0] as
-- its cover), and `idx_hire_media_listing` covers only hire_listing_id, so that
-- sort had no index behind it either.
-- ============================================================

-- ── Browse ordering ──────────────────────────────────────────
-- Partial on published: drafts, suspended and withdrawn rows accumulate and the
-- grid never reads them.

create index if not exists hire_listings_browse_recent_idx
  on public.hire_listings (created_at desc)
  where status = 'published';

create index if not exists hire_listings_browse_rate_idx
  on public.hire_listings (daily_rate)
  where status = 'published';

-- City is the facet the rental search leads with, and it pairs with the default
-- ordering.
create index if not exists hire_listings_browse_city_recent_idx
  on public.hire_listings (city, created_at desc)
  where status = 'published';

-- `available=true` is the narrowest and most-used filter on the grid.
create index if not exists hire_listings_browse_available_idx
  on public.hire_listings (availability, created_at desc)
  where status = 'published';

-- ── Substring search ─────────────────────────────────────────
-- `ilike '%toyota%'` on make and `ilike '%douala%'` on city cannot use a btree.
-- pg_trgm is already installed by migration 034; the guard keeps this file
-- runnable on its own.
create extension if not exists pg_trgm;

create index if not exists hire_listings_make_trgm_idx
  on public.hire_listings using gin (make gin_trgm_ops);

create index if not exists hire_listings_city_trgm_idx
  on public.hire_listings using gin (city gin_trgm_ops);

-- ── Photo embed ──────────────────────────────────────────────
-- Cover photo lookup: (listing, display_order) restricted to photos, since
-- videos share the table and are now filtered out of every gallery and card.
create index if not exists hire_listing_media_photo_idx
  on public.hire_listing_media (hire_listing_id, display_order)
  where asset_type = 'photo';
