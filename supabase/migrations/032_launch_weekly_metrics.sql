-- Weekly scorecard history.
--
-- /admin/launch could only ever show the current week, so week 1 became
-- unreadable the moment week 2 started and the scorecard's week 1-4 columns
-- had to be kept by hand. One row per week per metric, upserted, so
-- recapturing the in-progress week refines it instead of duplicating it.

create table if not exists public.launch_weekly_metrics (
  week_start  date not null,
  metric_key  text not null,
  value       integer not null default 0,
  captured_at timestamptz not null default now(),
  primary key (week_start, metric_key)
);

create index if not exists launch_weekly_metrics_week_idx
  on public.launch_weekly_metrics (week_start desc);

alter table public.launch_weekly_metrics enable row level security;

create policy "service_role_all_launch_weekly_metrics"
  on public.launch_weekly_metrics for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
