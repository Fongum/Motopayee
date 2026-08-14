-- Track MotoPayee revenue from financed vehicle deals.

create table if not exists public.finance_commissions (
  id                      uuid primary key default gen_random_uuid(),
  application_id          uuid not null references public.financing_applications(id) on delete cascade,
  listing_id              uuid references public.listings(id) on delete set null,
  buyer_id                uuid references public.profiles(id) on delete set null,
  mfi_institution_id      uuid references public.mfi_institutions(id) on delete set null,
  vehicle_value_xaf       numeric(15,2) not null default 0,
  commission_rate_percent numeric(5,2) not null default 2.00,
  commission_amount_xaf   numeric(15,2) not null default 0,
  status                  text not null default 'expected'
    check (status in ('expected', 'invoiced', 'paid', 'waived')),
  due_at                  timestamptz,
  paid_at                 timestamptz,
  notes                   text,
  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (application_id)
);

create index if not exists finance_commissions_status_idx
  on public.finance_commissions (status, created_at desc);

create index if not exists finance_commissions_mfi_idx
  on public.finance_commissions (mfi_institution_id, created_at desc);

create trigger finance_commissions_updated_at
  before update on public.finance_commissions
  for each row execute function public.set_updated_at();

alter table public.finance_commissions enable row level security;

create policy "service_role_all_finance_commissions"
  on public.finance_commissions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
