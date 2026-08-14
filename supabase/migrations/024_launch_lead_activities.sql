-- Activity timeline for launch lead follow-up.

create table if not exists public.launch_lead_activities (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.launch_leads(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  summary     text,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists launch_lead_activities_lead_idx
  on public.launch_lead_activities (lead_id, created_at desc);

create index if not exists launch_lead_activities_actor_idx
  on public.launch_lead_activities (actor_id, created_at desc)
  where actor_id is not null;

alter table public.launch_lead_activities enable row level security;

create policy "service_role_all_launch_lead_activities"
  on public.launch_lead_activities for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
