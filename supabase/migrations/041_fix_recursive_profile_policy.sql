-- ============================================================
-- Migration 041 — Break the recursive policy on profiles
--
-- `admin_all_profiles` (migration 001) is a policy ON public.profiles whose
-- USING clause reads FROM public.profiles:
--
--   using (exists (select 1 from public.profiles p
--                   where p.auth_id = auth.uid() and p.role = 'admin'))
--
-- Evaluating it requires evaluating the policies on profiles, which requires
-- evaluating it again. PostgreSQL stops with 42P17, "infinite recursion
-- detected in policy for relation profiles".
--
-- The damage is not limited to profiles. Policies across the schema resolve the
-- caller with `... in (select id from public.profiles where auth_id = auth.uid())`,
-- and that subquery applies profiles' policies too — so the recursion propagates
-- outward. Verified against the live database: reading any of
--
--   profiles, listings, vehicles, media_assets, dealers, zone_rules,
--   financing_applications, import_requests, import_orders, import_quotes,
--   import_offers, import_payments, import_shipments, import_documents
--
-- with the anon key fails with 42P17. Thirteen tables, one bad policy.
--
-- The app has not noticed because every server component and route handler
-- queries through the service-role key, which bypasses RLS entirely. Anything
-- reaching Supabase with the anon or an authenticated user's key — a client
-- component, a future mobile client — hits the wall.
--
-- The fix is the established one for this codebase: resolve the caller's role
-- in a SECURITY DEFINER helper that does not itself re-enter RLS. `security
-- definer` alone is not enough; row_security must be pinned off, or the
-- function body re-evaluates the same policies and recurses exactly as before.
-- ============================================================

-- ── Caller's role, resolved without re-entering RLS ──────────
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role
    from public.profiles
   where auth_id = auth.uid()
   limit 1;
$$;

comment on function public.current_profile_role() is
  'Role of the profile belonging to auth.uid(), read with row_security off so it '
  'can be called from inside an RLS policy on profiles without recursing. '
  'Returns only the callers own role, which is why anon and authenticated may '
  'execute it.';

-- Policies are evaluated as the querying role, so anon and authenticated need
-- EXECUTE or every policy referencing this raises "permission denied". Note the
-- revoke is FROM PUBLIC: revoking from anon/authenticated alone does nothing,
-- because the default grant is held through PUBLIC (see migration 040).
revoke execute on function public.current_profile_role() from public;
grant  execute on function public.current_profile_role() to anon, authenticated, service_role;

-- ── Replace the recursive policy ─────────────────────────────
drop policy if exists "admin_all_profiles" on public.profiles;

create policy "admin_all_profiles"
  on public.profiles for all
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- ── Same shape, same fix ─────────────────────────────────────
-- zone_rules_staff_select (migration 003) reads FROM profiles inside its USING
-- clause. That is not self-recursive on its own, but it inherits the recursion
-- through profiles' policies, and the helper is cheaper besides.
drop policy if exists "zone_rules_staff_select" on public.zone_rules;

create policy "zone_rules_staff_select"
  on public.zone_rules for select
  using (
    public.current_profile_role() in ('admin', 'field_agent', 'inspector', 'verifier')
  );
