-- Competing MFI partner responses for financing applications.

create table if not exists public.mfi_application_offers (
  id                     uuid primary key default gen_random_uuid(),
  application_id         uuid not null references public.financing_applications(id) on delete cascade,
  mfi_institution_id     uuid not null references public.mfi_institutions(id) on delete cascade,
  responder_id           uuid references public.profiles(id) on delete set null,
  status                 text not null default 'submitted'
    check (status in ('submitted', 'shortlisted', 'accepted', 'declined', 'withdrawn')),
  proposed_down_payment_percent numeric(5,2),
  proposed_tenor_months integer,
  proposed_interest_rate_percent numeric(5,2),
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (application_id, mfi_institution_id)
);

create index if not exists mfi_application_offers_application_idx
  on public.mfi_application_offers (application_id);

create index if not exists mfi_application_offers_mfi_idx
  on public.mfi_application_offers (mfi_institution_id, created_at desc);

create trigger mfi_application_offers_updated_at
  before update on public.mfi_application_offers
  for each row execute function public.set_updated_at();

alter table public.mfi_application_offers enable row level security;

create policy "service_role_all_mfi_application_offers"
  on public.mfi_application_offers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
