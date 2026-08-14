-- General launch lead tracker for seller, dealer, rental, buyer, renter, MFI, and inspection outreach.

create table if not exists public.launch_leads (
  id                  uuid primary key default gen_random_uuid(),
  lead_type           text not null
    check (lead_type in ('seller', 'dealer', 'rental_owner', 'buyer', 'renter', 'mfi', 'inspection', 'other')),
  source              text not null default 'website'
    check (source in ('website', 'whatsapp', 'referral', 'facebook', 'field', 'dealer_visit', 'staff', 'other')),
  status              text not null default 'new'
    check (status in ('new', 'contacted', 'interested', 'qualified', 'onboarding', 'converted', 'not_fit', 'closed')),
  priority            text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  name                text not null,
  business_name       text,
  phone               text,
  email               text,
  city                text,
  interest            text,
  notes               text,
  assigned_to         uuid references public.profiles(id) on delete set null,
  next_follow_up_at   timestamptz,
  converted_entity_type text,
  converted_entity_id uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists launch_leads_status_idx
  on public.launch_leads (status, created_at desc);

create index if not exists launch_leads_type_idx
  on public.launch_leads (lead_type, created_at desc);

create index if not exists launch_leads_assigned_idx
  on public.launch_leads (assigned_to, next_follow_up_at)
  where assigned_to is not null;

create trigger launch_leads_updated_at
  before update on public.launch_leads
  for each row execute function public.set_updated_at();

alter table public.launch_leads enable row level security;

create policy "service_role_all_launch_leads"
  on public.launch_leads for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
