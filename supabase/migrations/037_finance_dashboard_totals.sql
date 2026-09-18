-- ============================================================
-- Migration 037 — Finance dashboard totals computed in the database
--
-- `app/admin/finance/page.tsx` is the commission reconciliation screen. Every
-- figure on it was summed in JavaScript over an unbounded select:
--
--   * "A facturer" / "Facturee" / "Encaissee" — the platform's commission
--     revenue — came from `finance_commissions.select('status,
--     commission_amount_xaf')` with no limit, reduced in Node.
--   * "A decaisser" / "Financees" — the vehicle value approved and disbursed —
--     were reduced over the same truncated page of applications the table below
--     renders.
--
-- PostgREST stops at db-max-rows (1000 by default), so all five figures
-- silently under-reported once the tables outgrew that. These are the numbers
-- the business reconciles against its partners.
--
-- Summing in Postgres also keeps the money in `numeric`. The JS version ran
-- every amount through a float; the sums are returned here as text so the
-- precision survives the trip, matching how PostgREST already serialises
-- numeric columns.
-- ============================================================

-- ── Commission totals, by status ─────────────────────────────
create or replace function public.finance_commission_totals()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_object_agg(status, jsonb_build_object('count', n, 'amount', amount))
      from (
        select status,
               count(*)                             as n,
               sum(commission_amount_xaf)::text     as amount
          from public.finance_commissions
         group by status
      ) s
  ), '{}'::jsonb);
$$;

-- ── Financing pipeline totals, by application status ─────────
-- Vehicle value comes from the listing the application points at; an
-- application whose listing was deleted contributes 0 rather than dropping the
-- row, which is why this is a left join and not an inner one.
create or replace function public.financing_pipeline_totals()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select jsonb_object_agg(status, jsonb_build_object('count', n, 'amount', amount))
      from (
        select a.status,
               count(*)                                       as n,
               coalesce(sum(l.asking_price), 0)::text          as amount
          from public.financing_applications a
          left join public.listings l on l.id = a.listing_id
         where a.status in ('approved', 'disbursed')
         group by a.status
      ) s
  ), '{}'::jsonb);
$$;

-- Admin-only: these are security definer and read platform-wide data, and are
-- only ever called with the service-role key from a guarded page.
--
-- Revoke FROM PUBLIC, not from anon/authenticated. PostgreSQL grants EXECUTE on
-- a new function to PUBLIC by default and those roles hold it through PUBLIC, so
-- revoking from them directly removes nothing. The grant back is required because
-- revoking from PUBLIC also strips service_role.
revoke execute on function public.finance_commission_totals() from public;
grant  execute on function public.finance_commission_totals() to service_role;

revoke execute on function public.financing_pipeline_totals() from public;
grant  execute on function public.financing_pipeline_totals() to service_role;


-- ── Indexes ──────────────────────────────────────────────────
-- The status rollups group by status; the dashboard also filters by it.
create index if not exists finance_commissions_status_idx
  on public.finance_commissions (status);

-- The application list orders by disbursed_at then decided_at, filtered to the
-- two live statuses.
create index if not exists financing_applications_pipeline_idx
  on public.financing_applications (status, disbursed_at desc nulls last, decided_at desc);
