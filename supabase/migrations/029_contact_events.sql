-- Contact intent tracking.
--
-- Buyers and renters leave the platform through wa.me / tel: links, so the
-- demand signal was invisible: sellers saw views but no proof of interest,
-- dealer pilots had no ROI number, and the launch scorecard had no source for
-- "buyer inquiries" / "renter inquiries". One row per contact click.

create table if not exists public.contact_events (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid references public.listings(id) on delete cascade,
  hire_listing_id uuid references public.hire_listings(id) on delete cascade,
  surface         text not null check (surface in ('listing', 'hire', 'support')),
  channel         text not null check (channel in ('whatsapp', 'call')),
  actor_id        uuid references public.profiles(id) on delete set null,
  date_day        date not null default current_date,
  created_at      timestamptz not null default now(),

  -- A listing contact targets a sale listing, a hire contact targets a hire
  -- listing, and support contacts target neither. Keeps the counts honest.
  constraint contact_events_target_check check (
    (surface = 'listing' and listing_id is not null and hire_listing_id is null)
    or (surface = 'hire' and hire_listing_id is not null and listing_id is null)
    or (surface = 'support' and listing_id is null and hire_listing_id is null)
  )
);

create index if not exists idx_ce_listing on public.contact_events (listing_id, date_day);
create index if not exists idx_ce_hire    on public.contact_events (hire_listing_id, date_day);
create index if not exists idx_ce_surface on public.contact_events (surface, created_at);

alter table public.contact_events enable row level security;

create policy "service_role_all_contact_events" on public.contact_events
  for all to service_role using (true) with check (true);
