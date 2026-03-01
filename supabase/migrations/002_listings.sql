-- ============================================================
-- Migration 002 — Listings + Media: vehicles, listings, media_assets
-- ============================================================

-- ============================================================
-- VEHICLES
-- ============================================================

create table if not exists public.vehicles (
  id              uuid primary key default gen_random_uuid(),
  make            text not null,
  model           text not null,
  year            integer not null check (year >= 1960 and year <= extract(year from now()) + 1),
  mileage_km      integer not null default 0 check (mileage_km >= 0),
  fuel_type       text not null default 'petrol' check (fuel_type in ('petrol', 'diesel', 'electric', 'hybrid', 'other')),
  transmission    text not null default 'manual' check (transmission in ('manual', 'automatic', 'other')),
  color           text,
  vin             text unique,
  engine_cc       integer,
  seats           integer,
  condition_grade text check (condition_grade in ('A', 'B', 'C', 'D')),
  inspection_notes text,
  created_at      timestamptz not null default now()
);

create index if not exists vehicles_make_model_idx on public.vehicles (make, model);

-- ============================================================
-- LISTINGS
-- ============================================================

create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references public.vehicles (id) on delete restrict,
  seller_id       uuid not null references public.profiles (id) on delete restrict,
  dealer_id       uuid references public.dealers (id) on delete set null,
  status          text not null default 'draft' check (status in (
                    'draft',
                    'ownership_submitted',
                    'ownership_verified',
                    'media_done',
                    'inspection_scheduled',
                    'inspected',
                    'pricing_review',
                    'published',
                    'sold',
                    'withdrawn'
                  )),
  asking_price    numeric(15, 2) not null,
  suggested_price numeric(15, 2),
  mve_low         numeric(15, 2),
  mve_high        numeric(15, 2),
  price_band      text check (price_band in ('green', 'yellow', 'red')),
  zone            text not null check (zone in ('A', 'B', 'C')),
  city            text,
  description     text,
  financeable     boolean not null default false,
  published_at    timestamptz,
  sold_at         timestamptz,
  -- Staff assignments
  field_agent_id  uuid references public.profiles (id) on delete set null,
  inspector_id    uuid references public.profiles (id) on delete set null,
  verifier_id     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists listings_seller_id_idx on public.listings (seller_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_zone_idx on public.listings (zone);
create index if not exists listings_published_idx on public.listings (published_at) where published_at is not null;
create index if not exists listings_field_agent_idx on public.listings (field_agent_id) where field_agent_id is not null;
create index if not exists listings_inspector_idx on public.listings (inspector_id) where inspector_id is not null;
create index if not exists listings_verifier_idx on public.listings (verifier_id) where verifier_id is not null;

create trigger listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ============================================================
-- MEDIA ASSETS
-- ============================================================

create table if not exists public.media_assets (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  asset_type    text not null default 'photo' check (asset_type in ('photo', 'video')),
  storage_path  text not null,
  bucket        text not null default 'listing-media',
  display_order integer not null default 0,
  caption       text,
  uploaded_by   uuid not null references public.profiles (id) on delete restrict,
  created_at    timestamptz not null default now()
);

create index if not exists media_assets_listing_id_idx on public.media_assets (listing_id, display_order);

-- ============================================================
-- RLS — VEHICLES
-- ============================================================

alter table public.vehicles enable row level security;

create policy "service_role_all_vehicles"
  on public.vehicles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Public read for vehicle details (via listing join)
create policy "vehicles_public_select"
  on public.vehicles for select
  using (
    exists (
      select 1 from public.listings l
      where l.vehicle_id = vehicles.id
        and l.status = 'published'
    )
  );

-- ============================================================
-- RLS — LISTINGS
-- ============================================================

alter table public.listings enable row level security;

create policy "service_role_all_listings"
  on public.listings for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Public: only published listings
create policy "listings_public_select"
  on public.listings for select
  using (status = 'published');

-- Sellers: manage own listings
create policy "listings_seller_select_own"
  on public.listings for select
  using (
    seller_id in (select id from public.profiles where auth_id = auth.uid())
  );

create policy "listings_seller_insert"
  on public.listings for insert
  with check (
    seller_id in (select id from public.profiles where auth_id = auth.uid())
  );

create policy "listings_seller_update_own"
  on public.listings for update
  using (
    seller_id in (select id from public.profiles where auth_id = auth.uid())
  );

-- ============================================================
-- RLS — MEDIA ASSETS
-- ============================================================

alter table public.media_assets enable row level security;

create policy "service_role_all_media"
  on public.media_assets for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Public: only media for published listings
create policy "media_public_select"
  on public.media_assets for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = media_assets.listing_id
        and l.status = 'published'
    )
  );

-- ============================================================
-- COMMENTS
-- ============================================================
comment on table public.vehicles is 'Vehicle records, one per physical vehicle';
comment on table public.listings is 'Vehicle listings linking vehicle to seller, with workflow status';
comment on table public.media_assets is 'Photos and videos for listings, stored in Supabase Storage';
comment on column public.listings.price_band is 'green = fair, yellow = slightly overpriced, red = significantly overpriced';
comment on column public.listings.financeable is 'Set by inspector after condition assessment';
