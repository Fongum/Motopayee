-- ============================================================
-- Migration 038 — Rental booking and service-fee totals in the database
--
-- `app/admin/hire/bookings/page.tsx` is the rental equivalent of the finance
-- reconciliation screen, and carried the same defects:
--
--   * "Frais a facturer" / "Frais factures" / "Frais encaisses" — the platform's
--     rental service-fee revenue — were reduced in JavaScript over
--     `hire_service_fees.select('status, fee_amount_xaf')` with no limit.
--   * "Valeur active" / "Payees" were reduced over whichever truncated page of
--     bookings the table below happened to render.
--
-- PostgREST stops at db-max-rows (1000 by default), so all of them silently
-- under-reported. See migration 037 for the same fix on the sales side.
--
-- Sums come back as text so `numeric(15,2)` money keeps its precision instead
-- of passing through a JavaScript float.
-- ============================================================

-- ── Service fee revenue, by status ───────────────────────────
create or replace function public.hire_service_fee_totals()
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
               count(*)                     as n,
               sum(fee_amount_xaf)::text    as amount
          from public.hire_service_fees
         group by status
      ) s
  ), '{}'::jsonb);
$$;

-- ── Booking totals, grouped two ways ─────────────────────────
-- The dashboard needs bookings bucketed by lifecycle status ("Demandes",
-- "Actives", "Valeur active") and separately by payment status ("Payees"), so
-- both rollups come back from one call rather than two scans.
create or replace function public.hire_booking_totals()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'by_status', coalesce((
      select jsonb_object_agg(status, jsonb_build_object('count', n, 'amount', amount))
        from (
          select status,
                 count(*)                                as n,
                 coalesce(sum(total_amount), 0)::text    as amount
            from public.hire_bookings
           group by status
        ) s
    ), '{}'::jsonb),

    'by_payment_status', coalesce((
      select jsonb_object_agg(payment_status, jsonb_build_object('count', n, 'amount', amount))
        from (
          select payment_status,
                 count(*)                                as n,
                 coalesce(sum(total_amount), 0)::text    as amount
            from public.hire_bookings
           group by payment_status
        ) p
    ), '{}'::jsonb)
  );
$$;

-- Admin-only: these are security definer and read platform-wide data, and are
-- only ever called with the service-role key from a guarded page.
--
-- Revoke FROM PUBLIC, not from anon/authenticated. PostgreSQL grants EXECUTE on
-- a new function to PUBLIC by default and those roles hold it through PUBLIC, so
-- revoking from them directly removes nothing. The grant back is required because
-- revoking from PUBLIC also strips service_role.
revoke execute on function public.hire_service_fee_totals() from public;
grant  execute on function public.hire_service_fee_totals() to service_role;

revoke execute on function public.hire_booking_totals() from public;
grant  execute on function public.hire_booking_totals() to service_role;


-- ── Indexes ──────────────────────────────────────────────────
create index if not exists hire_service_fees_status_idx
  on public.hire_service_fees (status);

-- The booking table's default ordering, and its payment-status rollup.
create index if not exists hire_bookings_created_at_idx
  on public.hire_bookings (created_at desc);

create index if not exists hire_bookings_payment_status_idx
  on public.hire_bookings (payment_status);
