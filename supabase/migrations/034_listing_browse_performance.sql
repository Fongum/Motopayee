-- ============================================================
-- Migration 034 — Listing browse performance
--
-- Two things the public /listings grid needs and did not have:
--
--   1. A sortable mileage. PostgREST can only order parent rows by parent
--      columns, so ordering listings by vehicles.mileage_km through the embed
--      was impossible: the "Kilométrage le plus bas" option silently fell back
--      to newest-first. Mileage is denormalised onto listings and kept in step
--      by trigger, so the sort works with one index and no join.
--
--   2. Indexes matching the query shapes the grid actually issues. Every browse
--      query is `status = 'published'` plus an ordering; the existing single
--      column status index cannot serve the sort, so each page was a filter and
--      then a sort of the whole published set.
-- ============================================================

-- ============================================================
-- DENORMALISED MILEAGE
-- ============================================================

alter table public.listings
  add column if not exists vehicle_mileage_km integer;

-- Backfill from the vehicle each listing already points at.
update public.listings l
   set vehicle_mileage_km = v.mileage_km
  from public.vehicles v
 where v.id = l.vehicle_id
   and l.vehicle_mileage_km is distinct from v.mileage_km;

-- ── Sync: listing side ───────────────────────────────────────
-- Fires when a listing is created or re-pointed at another vehicle.
create or replace function public.sync_listing_vehicle_mileage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select v.mileage_km into new.vehicle_mileage_km
    from public.vehicles v
   where v.id = new.vehicle_id;
  return new;
end;
$$;

drop trigger if exists listings_sync_vehicle_mileage on public.listings;
create trigger listings_sync_vehicle_mileage
  before insert or update of vehicle_id on public.listings
  for each row
  execute function public.sync_listing_vehicle_mileage();

-- ── Sync: vehicle side ───────────────────────────────────────
-- An inspector correcting the odometer must not leave the browse sort stale.
create or replace function public.propagate_vehicle_mileage_to_listings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings
     set vehicle_mileage_km = new.mileage_km
   where vehicle_id = new.id
     and vehicle_mileage_km is distinct from new.mileage_km;
  return new;
end;
$$;

drop trigger if exists vehicles_propagate_mileage on public.vehicles;
create trigger vehicles_propagate_mileage
  after update of mileage_km on public.vehicles
  for each row
  when (old.mileage_km is distinct from new.mileage_km)
  execute function public.propagate_vehicle_mileage_to_listings();

-- ============================================================
-- BROWSE INDEXES
--
-- Partial on status='published' so they stay small: the grid never reads a
-- draft, and drafts/sold rows accumulate indefinitely.
-- ============================================================

create index if not exists listings_browse_recent_idx
  on public.listings (created_at desc)
  where status = 'published';

create index if not exists listings_browse_price_idx
  on public.listings (asking_price)
  where status = 'published';

create index if not exists listings_browse_mileage_idx
  on public.listings (vehicle_mileage_km)
  where status = 'published';

-- Zone is the most-used facet and pairs with the default ordering.
create index if not exists listings_browse_zone_recent_idx
  on public.listings (zone, created_at desc)
  where status = 'published';

-- ── Vehicle-side filter support ──────────────────────────────
-- The inner join now resolves make/model/year/mileage/fuel/grade filters
-- directly, so those predicates land on vehicles and need cover.
create index if not exists vehicles_year_idx on public.vehicles (year);
create index if not exists vehicles_mileage_idx on public.vehicles (mileage_km);
create index if not exists vehicles_fuel_type_idx on public.vehicles (fuel_type);
create index if not exists vehicles_condition_grade_idx
  on public.vehicles (condition_grade)
  where condition_grade is not null;

-- `ilike '%toyota%'` cannot use the plain btree on (make, model). A trigram
-- index serves the substring match the search box sends.
create extension if not exists pg_trgm;

create index if not exists vehicles_make_trgm_idx
  on public.vehicles using gin (make gin_trgm_ops);

create index if not exists vehicles_model_trgm_idx
  on public.vehicles using gin (model gin_trgm_ops);

-- The card fetches only the primary photo: (listing_id, display_order) already
-- exists, but every browse query now also filters asset_type.
create index if not exists media_assets_listing_photo_idx
  on public.media_assets (listing_id, display_order)
  where asset_type = 'photo';
