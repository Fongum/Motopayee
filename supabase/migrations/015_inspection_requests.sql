-- Buyer-requested inspection leads.
-- Completed inspection reports remain in public.inspections.

create table if not exists public.inspection_requests (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  requester_id     uuid references public.profiles(id) on delete set null,
  requester_name   text not null,
  requester_phone  text not null,
  requester_email  text,
  request_type     text not null default 'buyer_requested'
    check (request_type in ('buyer_requested', 'seller_package', 'finance_check')),
  status           text not null default 'submitted'
    check (status in ('submitted', 'contacted', 'quoted', 'paid', 'scheduled', 'completed', 'cancelled')),
  fee_xaf          numeric(15,2) not null default 15000,
  preferred_window text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists inspection_requests_listing_id_idx
  on public.inspection_requests (listing_id);

create index if not exists inspection_requests_status_idx
  on public.inspection_requests (status, created_at desc);

create index if not exists inspection_requests_requester_id_idx
  on public.inspection_requests (requester_id)
  where requester_id is not null;

create trigger inspection_requests_updated_at
  before update on public.inspection_requests
  for each row execute function public.set_updated_at();

alter table public.inspection_requests enable row level security;

create policy "service_role_all_inspection_requests"
  on public.inspection_requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.inspection_requests is 'Buyer and seller inspection request leads before an inspection report is completed.';
