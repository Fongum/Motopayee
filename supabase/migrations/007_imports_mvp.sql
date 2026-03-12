-- ============================================================
-- Migration 007 - Assisted Import MVP
-- ============================================================

-- ============================================================
-- IMPORT REQUESTS
-- ============================================================

create table if not exists public.import_requests (
  id                uuid primary key default gen_random_uuid(),
  buyer_id          uuid not null references public.profiles (id) on delete restrict,
  mode              text not null default 'custom' check (mode in ('offer', 'custom')),
  source_country    text not null default 'US',
  make              text not null,
  model             text,
  year_min          integer check (year_min between 1960 and extract(year from now())::integer + 1),
  year_max          integer check (year_max between 1960 and extract(year from now())::integer + 1),
  budget_max_xaf    numeric(15, 2) not null check (budget_max_xaf > 0),
  body_type         text check (body_type in ('sedan', 'suv', 'pickup', 'hatchback', 'van', 'coupe', 'wagon', 'other')),
  fuel_type         text check (fuel_type in ('petrol', 'diesel', 'electric', 'hybrid', 'other')),
  transmission      text check (transmission in ('manual', 'automatic', 'other')),
  color_preferences text,
  notes             text,
  status            text not null default 'submitted' check (status in (
                      'draft',
                      'submitted',
                      'reviewing',
                      'quoted',
                      'accepted',
                      'cancelled',
                      'expired'
                    )),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (year_min is null or year_max is null or year_min <= year_max)
);

create index if not exists import_requests_buyer_id_idx on public.import_requests (buyer_id);
create index if not exists import_requests_status_idx on public.import_requests (status);
create index if not exists import_requests_created_at_idx on public.import_requests (created_at desc);

create trigger import_requests_updated_at
  before update on public.import_requests
  for each row execute function public.set_updated_at();

alter table public.import_requests enable row level security;

create policy "service_role_all_import_requests"
  on public.import_requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "import_requests_buyer_select_own"
  on public.import_requests for select
  using (
    buyer_id in (select id from public.profiles where auth_id = auth.uid())
  );

create policy "import_requests_buyer_insert"
  on public.import_requests for insert
  with check (
    buyer_id in (select id from public.profiles where auth_id = auth.uid())
  );

-- ============================================================
-- IMPORT QUOTES
-- ============================================================

create table if not exists public.import_quotes (
  id                   uuid primary key default gen_random_uuid(),
  request_id           uuid not null references public.import_requests (id) on delete cascade,
  partner_name         text not null,
  currency             text not null default 'XAF',
  fx_rate_to_xaf       numeric(12, 4),
  vehicle_price        numeric(15, 2) not null default 0 check (vehicle_price >= 0),
  auction_fee          numeric(15, 2) not null default 0 check (auction_fee >= 0),
  inland_transport_fee numeric(15, 2) not null default 0 check (inland_transport_fee >= 0),
  shipping_fee         numeric(15, 2) not null default 0 check (shipping_fee >= 0),
  insurance_fee        numeric(15, 2) not null default 0 check (insurance_fee >= 0),
  documentation_fee    numeric(15, 2) not null default 0 check (documentation_fee >= 0),
  motopayee_fee        numeric(15, 2) not null default 0 check (motopayee_fee >= 0),
  estimated_customs_fee numeric(15, 2) not null default 0 check (estimated_customs_fee >= 0),
  estimated_port_fee   numeric(15, 2) not null default 0 check (estimated_port_fee >= 0),
  total_estimated_xaf  numeric(15, 2) not null default 0 check (total_estimated_xaf >= 0),
  quote_terms          text,
  expires_at           timestamptz not null,
  quote_version        integer not null check (quote_version > 0),
  status               text not null default 'sent' check (status in (
                      'draft',
                      'sent',
                      'superseded',
                      'expired',
                      'accepted',
                      'rejected'
                    )),
  created_by           uuid not null references public.profiles (id) on delete restrict,
  created_at           timestamptz not null default now(),
  unique (request_id, quote_version)
);

create index if not exists import_quotes_request_id_idx on public.import_quotes (request_id, created_at desc);
create index if not exists import_quotes_status_idx on public.import_quotes (status);

alter table public.import_quotes enable row level security;

create policy "service_role_all_import_quotes"
  on public.import_quotes for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "import_quotes_buyer_select_own"
  on public.import_quotes for select
  using (
    exists (
      select 1
      from public.import_requests r
      where r.id = import_quotes.request_id
        and r.buyer_id in (select id from public.profiles where auth_id = auth.uid())
    )
  );

-- ============================================================
-- IMPORT ORDERS
-- ============================================================

create table if not exists public.import_orders (
  id                         uuid primary key default gen_random_uuid(),
  buyer_id                   uuid not null references public.profiles (id) on delete restrict,
  request_id                 uuid not null unique references public.import_requests (id) on delete restrict,
  accepted_quote_id          uuid not null unique references public.import_quotes (id) on delete restrict,
  partner_name               text not null,
  status                     text not null default 'quote_sent' check (status in (
                              'quote_sent',
                              'deposit_pending',
                              'deposit_paid',
                              'purchase_authorized',
                              'purchased',
                              'docs_pending',
                              'shipping_booked',
                              'in_transit',
                              'arrived_cameroon',
                              'ready_for_clearing',
                              'clearing_in_progress',
                              'completed',
                              'cancelled',
                              'refund_pending',
                              'refunded',
                              'disputed'
                            )),
  clearing_mode              text not null default 'self_clear' check (clearing_mode in ('self_clear', 'broker_assist')),
  destination_port           text,
  destination_city           text,
  reservation_deposit_amount numeric(15, 2),
  purchase_amount_due        numeric(15, 2),
  shipping_amount_due        numeric(15, 2),
  final_amount_due           numeric(15, 2),
  currency                   text not null default 'XAF',
  fx_rate_locked             numeric(12, 4),
  buyer_acknowledged_terms   boolean not null default false,
  purchased_at               timestamptz,
  arrived_at                 timestamptz,
  completed_at               timestamptz,
  cancelled_at               timestamptz,
  cancellation_reason        text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index if not exists import_orders_buyer_id_idx on public.import_orders (buyer_id);
create index if not exists import_orders_status_idx on public.import_orders (status);

create trigger import_orders_updated_at
  before update on public.import_orders
  for each row execute function public.set_updated_at();

alter table public.import_orders enable row level security;

create policy "service_role_all_import_orders"
  on public.import_orders for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "import_orders_buyer_select_own"
  on public.import_orders for select
  using (
    buyer_id in (select id from public.profiles where auth_id = auth.uid())
  );

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.import_requests is 'Buyer sourcing requests for assisted vehicle imports';
comment on table public.import_quotes is 'Admin-issued import quotes with pricing snapshots and expiry';
comment on table public.import_orders is 'Accepted assisted-import orders tracked separately from local listings';
comment on column public.import_quotes.currency is 'Display currency for the quote; amount fields are stored in customer-facing values';
