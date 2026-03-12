-- ============================================================
-- Migration 008 - Import Offers and Payments
-- ============================================================

-- ============================================================
-- IMPORT OFFERS
-- ============================================================

create table if not exists public.import_offers (
  id                    uuid primary key default gen_random_uuid(),
  partner_name          text not null,
  source_country        text not null default 'US',
  source_type           text not null default 'auction' check (source_type in ('auction', 'dealer', 'private')),
  external_ref          text,
  external_url          text,
  lot_number            text,
  status                text not null default 'active' check (status in ('draft', 'active', 'reserved', 'withdrawn', 'expired')),
  headline              text not null,
  make                  text not null,
  model                 text not null,
  year                  integer not null check (year >= 1960 and year <= extract(year from now())::integer + 1),
  mileage_km            integer check (mileage_km >= 0),
  fuel_type             text check (fuel_type in ('petrol', 'diesel', 'electric', 'hybrid', 'other')),
  transmission          text check (transmission in ('manual', 'automatic', 'other')),
  color                 text,
  vin_last6             text,
  title_status          text,
  condition_summary     text,
  damage_summary        text,
  vehicle_price         numeric(15, 2) not null default 0 check (vehicle_price >= 0),
  auction_fee           numeric(15, 2) not null default 0 check (auction_fee >= 0),
  inland_transport_fee  numeric(15, 2) not null default 0 check (inland_transport_fee >= 0),
  shipping_fee          numeric(15, 2) not null default 0 check (shipping_fee >= 0),
  insurance_fee         numeric(15, 2) not null default 0 check (insurance_fee >= 0),
  documentation_fee     numeric(15, 2) not null default 0 check (documentation_fee >= 0),
  motopayee_fee         numeric(15, 2) not null default 0 check (motopayee_fee >= 0),
  estimated_customs_fee numeric(15, 2) not null default 0 check (estimated_customs_fee >= 0),
  estimated_port_fee    numeric(15, 2) not null default 0 check (estimated_port_fee >= 0),
  total_estimated_xaf   numeric(15, 2) not null default 0 check (total_estimated_xaf >= 0),
  cover_image_url       text,
  media_json            jsonb not null default '[]'::jsonb,
  auction_end_at        timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists import_offers_status_idx on public.import_offers (status);
create index if not exists import_offers_source_country_idx on public.import_offers (source_country);
create index if not exists import_offers_created_at_idx on public.import_offers (created_at desc);

create trigger import_offers_updated_at
  before update on public.import_offers
  for each row execute function public.set_updated_at();

alter table public.import_offers enable row level security;

create policy "service_role_all_import_offers"
  on public.import_offers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "import_offers_public_select"
  on public.import_offers for select
  using (status = 'active');

-- ============================================================
-- IMPORT REQUEST EXTENSIONS
-- ============================================================

alter table public.import_requests
  add column if not exists offer_id uuid references public.import_offers (id) on delete set null;

create index if not exists import_requests_offer_id_idx on public.import_requests (offer_id) where offer_id is not null;

-- ============================================================
-- IMPORT QUOTE EXTENSIONS
-- ============================================================

alter table public.import_quotes
  add column if not exists reservation_deposit_amount numeric(15, 2) not null default 0 check (reservation_deposit_amount >= 0);

-- ============================================================
-- IMPORT PAYMENTS
-- ============================================================

create table if not exists public.import_payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.import_orders (id) on delete cascade,
  buyer_id      uuid not null references public.profiles (id) on delete restrict,
  amount        integer not null check (amount > 0),
  currency      text not null default 'XAF',
  payment_type  text not null default 'reservation_deposit' check (payment_type in (
                  'reservation_deposit',
                  'purchase_balance',
                  'shipping_fee',
                  'service_fee',
                  'refund'
                )),
  provider      text not null check (provider in ('mtn_momo', 'orange_money', 'cash', 'bank_transfer')),
  phone         text not null,
  external_ref  text,
  status        text not null default 'pending' check (status in ('pending', 'processing', 'successful', 'failed', 'cancelled')),
  initiated_at  timestamptz not null default now(),
  completed_at  timestamptz,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists import_payments_order_id_idx on public.import_payments (order_id);
create index if not exists import_payments_buyer_id_idx on public.import_payments (buyer_id);

alter table public.import_payments enable row level security;

create policy "service_role_all_import_payments"
  on public.import_payments for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "import_payments_buyer_select_own"
  on public.import_payments for select
  using (
    buyer_id in (select id from public.profiles where auth_id = auth.uid())
  );

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.import_offers is 'Curated sourceable vehicles for the assisted-import catalog';
comment on table public.import_payments is 'Mobile-money and manual payments for assisted-import orders';
comment on column public.import_quotes.reservation_deposit_amount is 'Buyer deposit required to lock an accepted import quote';
