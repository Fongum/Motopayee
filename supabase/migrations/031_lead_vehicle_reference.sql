-- Tie a launch lead to the vehicle it is about, and let a callback request
-- count as contact intent.
--
-- Buyer and renter leads arrived with only free-text interest, so staff could
-- not tell which vehicle a caller was asking about without reading the note.

alter table public.launch_leads
  add column if not exists listing_id uuid references public.listings(id) on delete set null,
  add column if not exists hire_listing_id uuid references public.hire_listings(id) on delete set null;

create index if not exists launch_leads_listing_idx
  on public.launch_leads (listing_id) where listing_id is not null;

create index if not exists launch_leads_hire_listing_idx
  on public.launch_leads (hire_listing_id) where hire_listing_id is not null;

-- A submitted callback form is a stronger signal than a WhatsApp tap; without
-- this the inquiry counts on /admin/launch would miss it entirely.
alter table public.contact_events
  drop constraint if exists contact_events_channel_check;

alter table public.contact_events
  add constraint contact_events_channel_check
  check (channel in ('whatsapp', 'call', 'form'));
