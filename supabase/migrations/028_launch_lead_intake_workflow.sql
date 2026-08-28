-- Persist launch lead intake progress and add inventory-conversion statuses.

alter table public.launch_leads
  add column if not exists intake_checklist jsonb not null default '{}';

alter table public.launch_leads
  drop constraint if exists launch_leads_status_check;

alter table public.launch_leads
  add constraint launch_leads_status_check
  check (status in (
    'new',
    'contacted',
    'interested',
    'qualified',
    'awaiting_assets',
    'ready_for_listing',
    'onboarding',
    'converted',
    'not_fit',
    'closed'
  ));

create index if not exists launch_leads_ready_for_listing_idx
  on public.launch_leads (lead_type, updated_at desc)
  where status = 'ready_for_listing';
