-- ============================================================
-- Migration 009 - Import Shipments and Documents
-- ============================================================

-- ============================================================
-- IMPORT SHIPMENTS
-- ============================================================

create table if not exists public.import_shipments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.import_orders (id) on delete cascade,
  carrier_name         text not null,
  container_type       text,
  container_no         text,
  booking_ref          text,
  bill_of_lading_no    text,
  port_of_loading      text,
  port_of_discharge    text,
  etd                  timestamptz,
  eta                  timestamptz,
  actual_departure_at  timestamptz,
  actual_arrival_at    timestamptz,
  status               text not null default 'draft' check (status in ('draft', 'booked', 'departed', 'arrived', 'released', 'closed')),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists import_shipments_order_id_idx on public.import_shipments (order_id);
create index if not exists import_shipments_status_idx on public.import_shipments (status);

create trigger import_shipments_updated_at
  before update on public.import_shipments
  for each row execute function public.set_updated_at();

alter table public.import_shipments enable row level security;

create policy "service_role_all_import_shipments"
  on public.import_shipments for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "import_shipments_buyer_select_own"
  on public.import_shipments for select
  using (
    exists (
      select 1
      from public.import_orders o
      where o.id = import_shipments.order_id
        and o.buyer_id in (select id from public.profiles where auth_id = auth.uid())
    )
  );

-- ============================================================
-- IMPORT DOCUMENTS
-- ============================================================

create table if not exists public.import_documents (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.import_orders (id) on delete cascade,
  shipment_id      uuid references public.import_shipments (id) on delete set null,
  uploader_id      uuid not null references public.profiles (id) on delete restrict,
  doc_type         text not null check (doc_type in (
                    'auction_invoice',
                    'bill_of_sale',
                    'title',
                    'partner_condition_report',
                    'export_certificate',
                    'insurance_certificate',
                    'bill_of_lading',
                    'ectn',
                    'fimex_record',
                    'customs_notice',
                    'delivery_note',
                    'other'
                  )),
  storage_path     text not null,
  bucket           text not null default 'documents-private',
  filename         text not null,
  content_type     text not null,
  file_size_bytes  bigint,
  verified         boolean not null default false,
  verified_by      uuid references public.profiles (id) on delete set null,
  verified_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists import_documents_order_id_idx on public.import_documents (order_id);
create index if not exists import_documents_shipment_id_idx on public.import_documents (shipment_id) where shipment_id is not null;

alter table public.import_documents enable row level security;

create policy "service_role_all_import_documents"
  on public.import_documents for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "import_documents_buyer_select_own"
  on public.import_documents for select
  using (
    exists (
      select 1
      from public.import_orders o
      where o.id = import_documents.order_id
        and o.buyer_id in (select id from public.profiles where auth_id = auth.uid())
    )
  );

-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.import_shipments is 'Shipment records and milestones for assisted-import orders';
comment on table public.import_documents is 'Private documents attached to assisted-import orders and shipments';
