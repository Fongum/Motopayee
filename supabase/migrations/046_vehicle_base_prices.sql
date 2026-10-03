-- ============================================================
-- Migration 046 — Vehicle base prices for the market value estimate
--
-- lib/pricing.ts valued every vehicle from one hard-coded base price
-- (BASE_PRICES = { DEFAULT: 18000 } USD), so make and model never affected
-- the estimate: with the 30% depreciation floor, every vehicle six or more
-- years old came out at exactly 3,150,000 XAF. The estimate still sets
-- price_band, which is one of the four keys into zone_rules (financing
-- eligibility), and sellers see it on their own listing page.
--
-- This moves base prices into a table staff edit at /admin/pricing, in XAF
-- (no USD peg). A row with model null is a make-wide fallback. Lookup is
-- make+model, then make, then the old default — so with the table empty,
-- every estimate is exactly what it was before.
--
-- listings.mve_basis records which of those an estimate used, so a figure
-- resting on the default can be labelled as such (and kept from sellers)
-- instead of being presented as a valuation.
-- ============================================================

create table if not exists public.vehicle_base_prices (
  id             uuid primary key default gen_random_uuid(),
  make           text not null check (btrim(make) <> ''),
  model          text check (model is null or btrim(model) <> ''),
  base_price_xaf bigint not null check (base_price_xaf > 0),
  notes          text,
  updated_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One row per make+model, and one make-wide row per make, case-insensitively.
create unique index if not exists vehicle_base_prices_make_model_key
  on public.vehicle_base_prices (lower(btrim(make)), lower(coalesce(btrim(model), '')));

alter table public.vehicle_base_prices enable row level security;

-- Internal pricing data: service role only, like the other staff-managed
-- reference tables. The app reads and writes it through supabaseAdmin.
drop policy if exists "service_role_all_vehicle_base_prices" on public.vehicle_base_prices;
create policy "service_role_all_vehicle_base_prices"
  on public.vehicle_base_prices for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

alter table public.listings
  add column if not exists mve_basis text
    check (mve_basis is null or mve_basis in ('model', 'make', 'default'));
