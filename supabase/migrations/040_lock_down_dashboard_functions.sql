-- ============================================================
-- Migration 040 — Re-apply the dashboard function grants
--
-- Migrations 036-039 were applied to production with a revoke that did nothing:
--
--   revoke execute on function public.<fn>(...) from anon, authenticated;
--
-- PostgreSQL grants EXECUTE on a new function to PUBLIC by default, and `anon` /
-- `authenticated` hold their access *through* PUBLIC — revoking a privilege they
-- were never granted directly removes nothing. Verified against the live
-- database: every one of these answered a POST to /rest/v1/rpc/<fn> with the
-- anon key.
--
-- 036-039 now carry the correct form, so a database built from scratch is fine.
-- This migration exists for the databases that already ran the earlier version:
-- re-running 036-039 is not an option, since a migration runner will not replay
-- them.
--
-- Safe either way. Every statement is idempotent, so applying this to a database
-- whose 036-039 were already correct changes nothing.
-- ============================================================

-- ── Lead dashboard (036) ─────────────────────────────────────
revoke execute on function public.launch_lead_metrics(timestamptz, text[]) from public;
grant  execute on function public.launch_lead_metrics(timestamptz, text[]) to service_role;

revoke execute on function public.launch_lead_workload(text[]) from public;
grant  execute on function public.launch_lead_workload(text[]) to service_role;

revoke execute on function public.launch_lead_activity_outcomes(timestamptz) from public;
grant  execute on function public.launch_lead_activity_outcomes(timestamptz) to service_role;

-- ── Finance reconciliation (037) ─────────────────────────────
revoke execute on function public.finance_commission_totals() from public;
grant  execute on function public.finance_commission_totals() to service_role;

revoke execute on function public.financing_pipeline_totals() from public;
grant  execute on function public.financing_pipeline_totals() to service_role;

-- ── Rental bookings (038) ────────────────────────────────────
revoke execute on function public.hire_service_fee_totals() from public;
grant  execute on function public.hire_service_fee_totals() to service_role;

revoke execute on function public.hire_booking_totals() from public;
grant  execute on function public.hire_booking_totals() to service_role;

-- ── MFI partners (039) ───────────────────────────────────────
revoke execute on function public.mfi_partner_stats(text[]) from public;
grant  execute on function public.mfi_partner_stats(text[]) to service_role;

-- ── Trigger helpers from 034 ─────────────────────────────────
-- Tidiness rather than a hole: PostgreSQL refuses to execute a function
-- returning `trigger` outside a trigger context whatever the grants say. They
-- are narrowed anyway so the default-grant habit does not spread.
revoke execute on function public.sync_listing_vehicle_mileage() from public;
revoke execute on function public.propagate_vehicle_mileage_to_listings() from public;
