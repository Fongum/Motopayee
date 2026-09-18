-- ============================================================
-- Migration 044 — Lock down recompute_profile_rating
--
-- recompute_profile_rating(uuid) was added in migration 011, before the
-- 036-043 effort that locked every dashboard/aggregate function down to
-- service_role. It never got the same treatment, and PostgreSQL grants
-- EXECUTE on a new function to PUBLIC by default — so unlike every function
-- from 036 onward, this one is still callable with the anon key. Confirmed
-- live: the anon key can call it successfully.
--
-- Both call sites (app/api/reviews, app/api/admin/reviews) already use
-- supabaseAdmin, so restricting to service_role changes nothing for the app.
--
-- The same belt-and-braces form migration 043 established: a revoke from
-- PUBLIC alone would not touch a *direct* grant to anon/authenticated (the
-- kind `alter default privileges ... grant execute ... to anon, authenticated`
-- produces at create time), so both are revoked explicitly.
--
-- Idempotent: revoking a privilege that is not held is not an error.
-- ============================================================

revoke execute on function public.recompute_profile_rating(uuid) from public;
revoke execute on function public.recompute_profile_rating(uuid) from anon, authenticated;
grant  execute on function public.recompute_profile_rating(uuid) to service_role;
