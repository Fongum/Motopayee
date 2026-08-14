-- Track MotoPayee revenue from rental bookings.

create table if not exists public.hire_service_fees (
  id                    uuid primary key default gen_random_uuid(),
  hire_booking_id       uuid not null references public.hire_bookings(id) on delete cascade,
  hire_listing_id       uuid references public.hire_listings(id) on delete set null,
  renter_id             uuid references public.profiles(id) on delete set null,
  owner_id              uuid references public.profiles(id) on delete set null,
  booking_value_xaf     numeric(15,2) not null default 0,
  fee_rate_percent      numeric(5,2) not null default 10.00,
  fee_amount_xaf        numeric(15,2) not null default 0,
  status                text not null default 'expected'
    check (status in ('expected', 'invoiced', 'paid', 'waived', 'refunded')),
  paid_at               timestamptz,
  notes                 text,
  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (hire_booking_id)
);

create index if not exists hire_service_fees_status_idx
  on public.hire_service_fees (status, created_at desc);

create index if not exists hire_service_fees_listing_idx
  on public.hire_service_fees (hire_listing_id, created_at desc);

create trigger hire_service_fees_updated_at
  before update on public.hire_service_fees
  for each row execute function public.set_updated_at();

alter table public.hire_service_fees enable row level security;

create policy "service_role_all_hire_service_fees"
  on public.hire_service_fees for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
