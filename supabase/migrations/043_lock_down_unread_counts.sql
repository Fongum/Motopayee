-- ============================================================
-- Migration 043 — Finish locking down unread_message_counts
--
-- After 040-042 were applied, the eight dashboard functions correctly refuse
-- the anon key (42501), but `unread_message_counts` still answers it — even
-- though 042 carries the same `revoke ... from public` that worked for the
-- others.
--
-- The cause was not determined from outside the database. Two things can leave
-- EXECUTE in place, and they need different statements:
--
--   1. The PUBLIC grant is still there — the revoke in 042 did not run, or ran
--      against a different signature.
--   2. `anon` / `authenticated` hold a *direct* grant, not one inherited from
--      PUBLIC. Supabase projects often carry
--      `alter default privileges in schema public grant execute on functions
--      to anon, authenticated`, which grants at CREATE time. Revoking from
--      PUBLIC does not touch a direct grant.
--
-- This does both. Note the pairing: `revoke ... from anon, authenticated` on its
-- own is the no-op that migration 040 exists to correct, but alongside a revoke
-- from PUBLIC it is the piece that removes a direct grant. Neither statement is
-- sufficient alone.
--
-- Idempotent: revoking a privilege that is not held is not an error.
-- ============================================================

revoke execute on function public.unread_message_counts(uuid) from public;
revoke execute on function public.unread_message_counts(uuid) from anon, authenticated;
grant  execute on function public.unread_message_counts(uuid) to service_role;

-- The same belt-and-braces treatment for the functions 040 already fixed, in
-- case any of them picked up a direct grant that the PUBLIC revoke left behind.
-- These are verified closed today; this only keeps them that way if the project
-- re-grants by default privilege on some future redeploy.
revoke execute on function public.launch_lead_metrics(timestamptz, text[]) from anon, authenticated;
revoke execute on function public.launch_lead_workload(text[]) from anon, authenticated;
revoke execute on function public.launch_lead_activity_outcomes(timestamptz) from anon, authenticated;
revoke execute on function public.finance_commission_totals() from anon, authenticated;
revoke execute on function public.financing_pipeline_totals() from anon, authenticated;
revoke execute on function public.hire_service_fee_totals() from anon, authenticated;
revoke execute on function public.hire_booking_totals() from anon, authenticated;
revoke execute on function public.mfi_partner_stats(text[]) from anon, authenticated;

-- `current_profile_role` is deliberately left executable by anon and
-- authenticated: RLS policies are evaluated as the querying role, so revoking
-- it would break every policy that calls it. It returns only the caller's own
-- role, which is why that is safe.
