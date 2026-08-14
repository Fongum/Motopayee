-- Track who last handled a financing application follow-up.

alter table public.financing_applications
  add column if not exists follow_up_actor_id uuid references public.profiles(id) on delete set null,
  add column if not exists follow_up_updated_at timestamptz;

create index if not exists financing_apps_follow_up_actor_idx
  on public.financing_applications (follow_up_actor_id, follow_up_updated_at desc)
  where follow_up_actor_id is not null;
