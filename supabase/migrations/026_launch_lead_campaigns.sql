alter table public.launch_leads
  add column if not exists campaign_name text;

create index if not exists launch_leads_campaign_name_idx
  on public.launch_leads (campaign_name, created_at desc)
  where campaign_name is not null;
