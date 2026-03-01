-- ============================================================
-- Migration 003 — Applications, Documents, Zone Rules, Audit Logs
-- ============================================================

-- ============================================================
-- INSPECTIONS
-- ============================================================

create table if not exists public.inspections (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references public.listings (id) on delete restrict,
  inspector_id        uuid not null references public.profiles (id) on delete restrict,
  condition_grade     text not null check (condition_grade in ('A', 'B', 'C', 'D')),
  financeable         boolean not null default false,
  report_json         jsonb not null default '{}'::jsonb,
  repair_estimate_low  numeric(15, 2),
  repair_estimate_high numeric(15, 2),
  notes               text,
  inspected_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists inspections_listing_id_idx on public.inspections (listing_id);
create index if not exists inspections_inspector_id_idx on public.inspections (inspector_id);

alter table public.inspections enable row level security;

create policy "service_role_all_inspections"
  on public.inspections for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- FINANCING APPLICATIONS
-- ============================================================

create table if not exists public.financing_applications (
  id                    uuid primary key default gen_random_uuid(),
  listing_id            uuid not null references public.listings (id) on delete restrict,
  buyer_id              uuid not null references public.profiles (id) on delete restrict,
  verifier_id           uuid references public.profiles (id) on delete set null,
  status                text not null default 'draft' check (status in (
                          'draft',
                          'submitted',
                          'docs_pending',
                          'docs_received',
                          'under_review',
                          'approved',
                          'rejected',
                          'disbursed',
                          'withdrawn'
                        )),
  income_grade          text check (income_grade in ('A', 'B', 'C', 'D')),
  down_payment_percent  numeric(5, 2),
  max_tenor             integer,
  manual_review_required boolean not null default false,
  notes                 text,
  submitted_at          timestamptz,
  decided_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists apps_buyer_id_idx on public.financing_applications (buyer_id);
create index if not exists apps_listing_id_idx on public.financing_applications (listing_id);
create index if not exists apps_status_idx on public.financing_applications (status);
create index if not exists apps_verifier_id_idx on public.financing_applications (verifier_id) where verifier_id is not null;

create trigger financing_apps_updated_at
  before update on public.financing_applications
  for each row execute function public.set_updated_at();

alter table public.financing_applications enable row level security;

create policy "service_role_all_apps"
  on public.financing_applications for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Buyers: manage own applications
create policy "apps_buyer_select_own"
  on public.financing_applications for select
  using (
    buyer_id in (select id from public.profiles where auth_id = auth.uid())
  );

create policy "apps_buyer_insert"
  on public.financing_applications for insert
  with check (
    buyer_id in (select id from public.profiles where auth_id = auth.uid())
  );

create policy "apps_buyer_update_own"
  on public.financing_applications for update
  using (
    buyer_id in (select id from public.profiles where auth_id = auth.uid())
    and status = 'draft'
  );

-- ============================================================
-- DOCUMENTS
-- ============================================================

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null check (entity_type in ('listing', 'application')),
  entity_id     uuid not null,
  uploader_id   uuid not null references public.profiles (id) on delete restrict,
  doc_type      text not null check (doc_type in (
                  'ownership_title',
                  'id_national',
                  'id_passport',
                  'income_proof',
                  'bank_statement',
                  'utility_bill',
                  'other'
                )),
  storage_path  text not null,
  bucket        text not null default 'documents-private',
  filename      text not null,
  content_type  text not null,
  file_size_bytes bigint,
  verified      boolean not null default false,
  verified_by   uuid references public.profiles (id) on delete set null,
  verified_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists documents_entity_idx on public.documents (entity_type, entity_id);
create index if not exists documents_uploader_idx on public.documents (uploader_id);

alter table public.documents enable row level security;

-- No public access to documents — service role only (access via signed URLs)
create policy "service_role_all_documents"
  on public.documents for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- ZONE RULES
-- ============================================================

create table if not exists public.zone_rules (
  id                    uuid primary key default gen_random_uuid(),
  zone                  text not null check (zone in ('A', 'B', 'C')),
  income_grade          text not null check (income_grade in ('A', 'B', 'C', 'D')),
  vehicle_price_band    text not null check (vehicle_price_band in ('green', 'yellow', 'red')),
  condition_grade       text not null check (condition_grade in ('A', 'B', 'C', 'D')),
  financeable           boolean not null default true,
  down_payment_percent  numeric(5, 2) not null default 20,
  max_tenor_months      integer not null default 36,
  manual_review_required boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (zone, income_grade, vehicle_price_band, condition_grade)
);

create trigger zone_rules_updated_at
  before update on public.zone_rules
  for each row execute function public.set_updated_at();

alter table public.zone_rules enable row level security;

create policy "service_role_all_zone_rules"
  on public.zone_rules for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Staff can read rules
create policy "zone_rules_staff_select"
  on public.zone_rules for select
  using (
    exists (
      select 1 from public.profiles p
      where p.auth_id = auth.uid()
        and p.role in ('field_agent', 'inspector', 'verifier', 'admin')
    )
  );

-- ============================================================
-- SEED ZONE RULES (default matrix)
-- ============================================================

insert into public.zone_rules (zone, income_grade, vehicle_price_band, condition_grade, financeable, down_payment_percent, max_tenor_months, manual_review_required)
values
  -- Zone A, Income A
  ('A', 'A', 'green',  'A', true,  15, 60, false),
  ('A', 'A', 'green',  'B', true,  15, 48, false),
  ('A', 'A', 'green',  'C', true,  20, 36, false),
  ('A', 'A', 'green',  'D', true,  25, 24, true),
  ('A', 'A', 'yellow', 'A', true,  20, 48, false),
  ('A', 'A', 'yellow', 'B', true,  20, 36, false),
  ('A', 'A', 'yellow', 'C', true,  25, 24, true),
  ('A', 'A', 'yellow', 'D', false, 30, 12, true),
  ('A', 'A', 'red',    'A', true,  25, 36, true),
  ('A', 'A', 'red',    'B', true,  30, 24, true),
  ('A', 'A', 'red',    'C', false, 35, 12, true),
  ('A', 'A', 'red',    'D', false, 40, 12, true),
  -- Zone A, Income B
  ('A', 'B', 'green',  'A', true,  20, 48, false),
  ('A', 'B', 'green',  'B', true,  20, 36, false),
  ('A', 'B', 'green',  'C', true,  25, 24, true),
  ('A', 'B', 'green',  'D', false, 30, 12, true),
  ('A', 'B', 'yellow', 'A', true,  25, 36, false),
  ('A', 'B', 'yellow', 'B', true,  25, 24, true),
  ('A', 'B', 'yellow', 'C', false, 30, 12, true),
  ('A', 'B', 'yellow', 'D', false, 35, 12, true),
  ('A', 'B', 'red',    'A', true,  30, 24, true),
  ('A', 'B', 'red',    'B', false, 35, 12, true),
  ('A', 'B', 'red',    'C', false, 40, 12, true),
  ('A', 'B', 'red',    'D', false, 40, 12, true),
  -- Zone A, Income C
  ('A', 'C', 'green',  'A', true,  25, 36, true),
  ('A', 'C', 'green',  'B', true,  25, 24, true),
  ('A', 'C', 'green',  'C', false, 30, 12, true),
  ('A', 'C', 'green',  'D', false, 35, 12, true),
  ('A', 'C', 'yellow', 'A', true,  30, 24, true),
  ('A', 'C', 'yellow', 'B', false, 35, 12, true),
  ('A', 'C', 'yellow', 'C', false, 40, 12, true),
  ('A', 'C', 'yellow', 'D', false, 40, 12, true),
  ('A', 'C', 'red',    'A', false, 35, 12, true),
  ('A', 'C', 'red',    'B', false, 40, 12, true),
  ('A', 'C', 'red',    'C', false, 40, 12, true),
  ('A', 'C', 'red',    'D', false, 40, 12, true),
  -- Zone A, Income D
  ('A', 'D', 'green',  'A', false, 35, 12, true),
  ('A', 'D', 'green',  'B', false, 40, 12, true),
  ('A', 'D', 'green',  'C', false, 40, 12, true),
  ('A', 'D', 'green',  'D', false, 40, 12, true),
  ('A', 'D', 'yellow', 'A', false, 40, 12, true),
  ('A', 'D', 'yellow', 'B', false, 40, 12, true),
  ('A', 'D', 'yellow', 'C', false, 40, 12, true),
  ('A', 'D', 'yellow', 'D', false, 40, 12, true),
  ('A', 'D', 'red',    'A', false, 40, 12, true),
  ('A', 'D', 'red',    'B', false, 40, 12, true),
  ('A', 'D', 'red',    'C', false, 40, 12, true),
  ('A', 'D', 'red',    'D', false, 40, 12, true),
  -- Zone B (slightly stricter)
  ('B', 'A', 'green',  'A', true,  20, 48, false),
  ('B', 'A', 'green',  'B', true,  20, 36, false),
  ('B', 'A', 'green',  'C', true,  25, 24, true),
  ('B', 'A', 'green',  'D', false, 30, 12, true),
  ('B', 'A', 'yellow', 'A', true,  25, 36, false),
  ('B', 'A', 'yellow', 'B', true,  25, 24, true),
  ('B', 'A', 'yellow', 'C', false, 30, 12, true),
  ('B', 'A', 'yellow', 'D', false, 35, 12, true),
  ('B', 'A', 'red',    'A', false, 30, 24, true),
  ('B', 'A', 'red',    'B', false, 35, 12, true),
  ('B', 'A', 'red',    'C', false, 40, 12, true),
  ('B', 'A', 'red',    'D', false, 40, 12, true),
  ('B', 'B', 'green',  'A', true,  25, 36, false),
  ('B', 'B', 'green',  'B', true,  25, 24, true),
  ('B', 'B', 'green',  'C', false, 30, 12, true),
  ('B', 'B', 'green',  'D', false, 35, 12, true),
  ('B', 'B', 'yellow', 'A', true,  30, 24, true),
  ('B', 'B', 'yellow', 'B', false, 35, 12, true),
  ('B', 'B', 'yellow', 'C', false, 40, 12, true),
  ('B', 'B', 'yellow', 'D', false, 40, 12, true),
  ('B', 'B', 'red',    'A', false, 35, 12, true),
  ('B', 'B', 'red',    'B', false, 40, 12, true),
  ('B', 'B', 'red',    'C', false, 40, 12, true),
  ('B', 'B', 'red',    'D', false, 40, 12, true),
  ('B', 'C', 'green',  'A', false, 30, 24, true),
  ('B', 'C', 'green',  'B', false, 35, 12, true),
  ('B', 'C', 'green',  'C', false, 40, 12, true),
  ('B', 'C', 'green',  'D', false, 40, 12, true),
  ('B', 'C', 'yellow', 'A', false, 35, 12, true),
  ('B', 'C', 'yellow', 'B', false, 40, 12, true),
  ('B', 'C', 'yellow', 'C', false, 40, 12, true),
  ('B', 'C', 'yellow', 'D', false, 40, 12, true),
  ('B', 'C', 'red',    'A', false, 40, 12, true),
  ('B', 'C', 'red',    'B', false, 40, 12, true),
  ('B', 'C', 'red',    'C', false, 40, 12, true),
  ('B', 'C', 'red',    'D', false, 40, 12, true),
  ('B', 'D', 'green',  'A', false, 40, 12, true),
  ('B', 'D', 'green',  'B', false, 40, 12, true),
  ('B', 'D', 'green',  'C', false, 40, 12, true),
  ('B', 'D', 'green',  'D', false, 40, 12, true),
  ('B', 'D', 'yellow', 'A', false, 40, 12, true),
  ('B', 'D', 'yellow', 'B', false, 40, 12, true),
  ('B', 'D', 'yellow', 'C', false, 40, 12, true),
  ('B', 'D', 'yellow', 'D', false, 40, 12, true),
  ('B', 'D', 'red',    'A', false, 40, 12, true),
  ('B', 'D', 'red',    'B', false, 40, 12, true),
  ('B', 'D', 'red',    'C', false, 40, 12, true),
  ('B', 'D', 'red',    'D', false, 40, 12, true),
  -- Zone C (most restrictive)
  ('C', 'A', 'green',  'A', true,  25, 36, true),
  ('C', 'A', 'green',  'B', true,  25, 24, true),
  ('C', 'A', 'green',  'C', false, 30, 12, true),
  ('C', 'A', 'green',  'D', false, 35, 12, true),
  ('C', 'A', 'yellow', 'A', false, 30, 24, true),
  ('C', 'A', 'yellow', 'B', false, 35, 12, true),
  ('C', 'A', 'yellow', 'C', false, 40, 12, true),
  ('C', 'A', 'yellow', 'D', false, 40, 12, true),
  ('C', 'A', 'red',    'A', false, 35, 12, true),
  ('C', 'A', 'red',    'B', false, 40, 12, true),
  ('C', 'A', 'red',    'C', false, 40, 12, true),
  ('C', 'A', 'red',    'D', false, 40, 12, true),
  ('C', 'B', 'green',  'A', false, 30, 24, true),
  ('C', 'B', 'green',  'B', false, 35, 12, true),
  ('C', 'B', 'green',  'C', false, 40, 12, true),
  ('C', 'B', 'green',  'D', false, 40, 12, true),
  ('C', 'B', 'yellow', 'A', false, 35, 12, true),
  ('C', 'B', 'yellow', 'B', false, 40, 12, true),
  ('C', 'B', 'yellow', 'C', false, 40, 12, true),
  ('C', 'B', 'yellow', 'D', false, 40, 12, true),
  ('C', 'B', 'red',    'A', false, 40, 12, true),
  ('C', 'B', 'red',    'B', false, 40, 12, true),
  ('C', 'B', 'red',    'C', false, 40, 12, true),
  ('C', 'B', 'red',    'D', false, 40, 12, true),
  ('C', 'C', 'green',  'A', false, 40, 12, true),
  ('C', 'C', 'green',  'B', false, 40, 12, true),
  ('C', 'C', 'green',  'C', false, 40, 12, true),
  ('C', 'C', 'green',  'D', false, 40, 12, true),
  ('C', 'C', 'yellow', 'A', false, 40, 12, true),
  ('C', 'C', 'yellow', 'B', false, 40, 12, true),
  ('C', 'C', 'yellow', 'C', false, 40, 12, true),
  ('C', 'C', 'yellow', 'D', false, 40, 12, true),
  ('C', 'C', 'red',    'A', false, 40, 12, true),
  ('C', 'C', 'red',    'B', false, 40, 12, true),
  ('C', 'C', 'red',    'C', false, 40, 12, true),
  ('C', 'C', 'red',    'D', false, 40, 12, true),
  ('C', 'D', 'green',  'A', false, 40, 12, true),
  ('C', 'D', 'green',  'B', false, 40, 12, true),
  ('C', 'D', 'green',  'C', false, 40, 12, true),
  ('C', 'D', 'green',  'D', false, 40, 12, true),
  ('C', 'D', 'yellow', 'A', false, 40, 12, true),
  ('C', 'D', 'yellow', 'B', false, 40, 12, true),
  ('C', 'D', 'yellow', 'C', false, 40, 12, true),
  ('C', 'D', 'yellow', 'D', false, 40, 12, true),
  ('C', 'D', 'red',    'A', false, 40, 12, true),
  ('C', 'D', 'red',    'B', false, 40, 12, true),
  ('C', 'D', 'red',    'C', false, 40, 12, true),
  ('C', 'D', 'red',    'D', false, 40, 12, true)
on conflict (zone, income_grade, vehicle_price_band, condition_grade) do nothing;

-- ============================================================
-- AUDIT LOGS
-- ============================================================

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null,
  actor_email text not null,
  actor_role  text not null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "service_role_all_audit_logs"
  on public.audit_logs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- COMMENTS
-- ============================================================
comment on table public.inspections is 'Inspector field reports with condition grade and financeable flag';
comment on table public.financing_applications is 'Buyer financing requests through the MFI pipeline';
comment on table public.documents is 'Uploaded documents for listings and applications — private storage';
comment on table public.zone_rules is 'Eligibility rules matrix: zone × income_grade × price_band × condition';
comment on table public.audit_logs is 'Immutable audit trail for all sensitive status transitions';
