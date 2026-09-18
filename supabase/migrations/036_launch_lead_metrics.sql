-- ============================================================
-- Migration 036 — Lead metrics computed in the database
--
-- `app/admin/leads/page.tsx` computed every headline metric in JavaScript:
-- it fetched all leads from the last 30 days, all open leads, and all lead
-- activities from the last 30 days, then counted the arrays with .filter() and
-- .reduce().
--
-- PostgREST caps an unbounded select at db-max-rows (1000 by default), so past
-- a thousand rows those arrays were silently truncated and every number on the
-- page under-reported — "1000 leads" forever, and a conversion rate computed
-- over an arbitrary truncated slice. No error, no warning; the dashboard simply
-- began lying as the business grew.
--
-- Counting belongs where the rows are. These functions return one jsonb blob
-- per panel, so the page makes three small round trips instead of dragging three
-- tables into Node.
--
-- The open-status list is passed in rather than hardcoded: the app already owns
-- that vocabulary (OPEN_STATUSES), and migration 028 extended it once already.
-- Duplicating it here would be one more thing to keep in sync.
-- ============================================================

-- ── Headline + breakdowns over a trailing window ─────────────
create or replace function public.launch_lead_metrics(
  p_since          timestamptz,
  p_open_statuses  text[]
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select lead_type, source, status, coalesce(campaign_name, '') as campaign
      from public.launch_leads
     where created_at >= p_since
  )
  select jsonb_build_object(
    'total',     (select count(*) from scoped),
    'converted', (select count(*) from scoped where status = 'converted'),
    'open',      (select count(*) from scoped where status = any(p_open_statuses)),

    'by_source', coalesce((
      select jsonb_agg(jsonb_build_object('key', source, 'count', n) order by n desc, source)
        from (select source, count(*) as n from scoped group by source) s
    ), '[]'::jsonb),

    'by_type', coalesce((
      select jsonb_agg(jsonb_build_object('key', lead_type, 'count', n) order by n desc, lead_type)
        from (select lead_type, count(*) as n from scoped group by lead_type) t
    ), '[]'::jsonb),

    'by_status', coalesce((
      select jsonb_agg(jsonb_build_object('key', status, 'count', n) order by n desc, status)
        from (select status, count(*) as n from scoped group by status) st
    ), '[]'::jsonb),

    'by_campaign', coalesce((
      select jsonb_agg(
               jsonb_build_object('campaign', campaign, 'total', total, 'open', open_n, 'converted', converted_n)
               order by total desc, converted_n desc, campaign
             )
        from (
          select campaign,
                 count(*)                                                as total,
                 count(*) filter (where status = any(p_open_statuses))   as open_n,
                 count(*) filter (where status = 'converted')            as converted_n
            from scoped
           group by campaign
        ) c
    ), '[]'::jsonb)
  );
$$;

-- ── Open-lead workload, by assignee and by campaign ──────────
create or replace function public.launch_lead_workload(
  p_open_statuses text[]
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with open_leads as (
    select assigned_to,
           coalesce(campaign_name, '') as campaign,
           created_at,
           next_follow_up_at
      from public.launch_leads
     where status = any(p_open_statuses)
  )
  select jsonb_build_object(
    'unassigned', (select count(*) from open_leads where assigned_to is null),
    -- "Stale" mirrors the page's own rule: open and at least seven days old.
    'stale',      (select count(*) from open_leads where created_at <= now() - interval '7 days'),

    'by_staff', coalesce((
      select jsonb_agg(jsonb_build_object('assigned_to', assigned_to, 'open', open_n, 'due', due_n)
                       order by open_n desc, due_n desc)
        from (
          select assigned_to,
                 count(*)                                                    as open_n,
                 count(*) filter (where next_follow_up_at <= now())          as due_n
            from open_leads
           where assigned_to is not null
           group by assigned_to
        ) s
    ), '[]'::jsonb),

    'due_by_campaign', coalesce((
      select jsonb_agg(jsonb_build_object('campaign', campaign, 'due', due_n) order by due_n desc, campaign)
        from (
          select campaign, count(*) filter (where next_follow_up_at <= now()) as due_n
            from open_leads
           group by campaign
        ) c
       where due_n > 0
    ), '[]'::jsonb)
  );
$$;

-- ── Activity outcomes over a trailing window ─────────────────
-- The page pulled every activity row's `meta` just to tally meta->>'outcome'.
create or replace function public.launch_lead_activity_outcomes(
  p_since timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_agg(jsonb_build_object('key', outcome, 'count', n) order by n desc, outcome)
      from (
        select meta ->> 'outcome' as outcome, count(*) as n
          from public.launch_lead_activities
         where created_at >= p_since
           and meta ->> 'outcome' is not null
         group by 1
      ) o
  ), '[]'::jsonb);
$$;

-- Admin-only: these are security definer and read platform-wide data, and are
-- only ever called with the service-role key from a guarded page.
--
-- Revoke FROM PUBLIC, not from anon/authenticated. PostgreSQL grants EXECUTE on
-- a new function to PUBLIC by default and those roles hold it through PUBLIC, so
-- revoking from them directly removes nothing. The grant back is required because
-- revoking from PUBLIC also strips service_role.
revoke execute on function public.launch_lead_metrics(timestamptz, text[]) from public;
grant  execute on function public.launch_lead_metrics(timestamptz, text[]) to service_role;

revoke execute on function public.launch_lead_workload(text[]) from public;
grant  execute on function public.launch_lead_workload(text[]) to service_role;

revoke execute on function public.launch_lead_activity_outcomes(timestamptz) from public;
grant  execute on function public.launch_lead_activity_outcomes(timestamptz) to service_role;


-- ── Indexes for the shapes above ─────────────────────────────
-- The 30-day window scan, and the list's default ordering.
create index if not exists launch_leads_created_at_idx
  on public.launch_leads (created_at desc);

-- Workload: open leads filtered by due date, grouped by assignee.
create index if not exists launch_leads_status_follow_up_idx
  on public.launch_leads (status, next_follow_up_at);

-- The activity outcome tally scans by date and reads one jsonb key.
create index if not exists launch_lead_activities_created_at_idx
  on public.launch_lead_activities (created_at desc);
