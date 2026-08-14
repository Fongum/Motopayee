-- Staff follow-up tracking for financing applications.

alter table public.financing_applications
  add column if not exists follow_up_status text not null default 'none'
    check (follow_up_status in ('none', 'call_needed', 'contacted', 'waiting_buyer', 'waiting_mfi', 'closed')),
  add column if not exists follow_up_notes text,
  add column if not exists next_follow_up_at timestamptz;

create index if not exists financing_apps_follow_up_idx
  on public.financing_applications (follow_up_status, next_follow_up_at)
  where follow_up_status <> 'none';
