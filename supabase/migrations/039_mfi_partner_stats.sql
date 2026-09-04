-- ============================================================
-- Migration 039 — MFI partner stats computed in the database
--
-- `app/admin/finance/partners/page.tsx` fetched three tables in full — every
-- assigned financing application (with its listing joined for the price), every
-- MFI offer, and every partner profile — and then, for each institution in the
-- table, filtered those arrays in the render to produce that row's numbers.
--
-- That is O(institutions x applications) in the page, on top of the usual
-- PostgREST truncation: past 1000 rows the per-partner application counts,
-- offer counts and disbursed value all silently under-reported, and the
-- headline "Valeur decaissee" with them.
--
-- One call now returns the whole rollup, keyed by institution id.
--
-- The "active" definition is passed in rather than hardcoded: the app owns that
-- vocabulary, and it is an *exclusion* list (anything not rejected, withdrawn
-- or disbursed is still in play), which is exactly the kind of rule that drifts
-- when it lives in two places.
-- ============================================================

create or replace function public.mfi_partner_stats(
  p_inactive_statuses text[]
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with assigned as (
    select a.id,
           a.status,
           a.mfi_institution_id,
           coalesce(l.asking_price, 0) as vehicle_value
      from public.financing_applications a
      left join public.listings l on l.id = a.listing_id
     where a.mfi_institution_id is not null
  ),
  app_stats as (
    select mfi_institution_id,
           count(*)                                                       as applications,
           count(*) filter (where not (status = any(p_inactive_statuses))) as active_applications,
           sum(vehicle_value) filter (where status = 'disbursed')          as disbursed_value
      from assigned
     group by mfi_institution_id
  ),
  offer_stats as (
    select mfi_institution_id,
           count(*)                                              as offers,
           count(*) filter (where buyer_response = 'interested')  as interested_offers
      from public.mfi_application_offers
     group by mfi_institution_id
  ),
  user_stats as (
    -- The page shows one representative contact per partner. It used to take
    -- `users[0]` from an unordered fetch, so which account appeared was
    -- arbitrary and could change between renders. Both fields are aggregated
    -- with the same ordering, so the name and the address belong to the same
    -- person and stay stable.
    select mfi_institution_id,
           count(*)                                                          as users,
           count(*) filter (where status = 'active')                          as active_users,
           (array_agg(email order by email))[1]                               as primary_user_email,
           (array_agg(coalesce(full_name, email) order by email))[1]          as primary_user_name
      from public.profiles
     where role = 'mfi_partner'
       and mfi_institution_id is not null
     group by mfi_institution_id
  ),
  institutions as (
    select id from public.mfi_institutions
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'active_partners',        (select count(*) from public.mfi_institutions where active),
      'linked_users',           (select count(*) from public.profiles
                                  where role = 'mfi_partner' and status = 'active'),
      'assigned_applications',  (select count(*) from assigned),
      'disbursed_value',        (select coalesce(sum(vehicle_value), 0)::text
                                   from assigned where status = 'disbursed')
    ),

    'by_institution', coalesce((
      select jsonb_object_agg(
               i.id,
               jsonb_build_object(
                 'applications',        coalesce(a.applications, 0),
                 'active_applications', coalesce(a.active_applications, 0),
                 'disbursed_value',     coalesce(a.disbursed_value, 0)::text,
                 'offers',              coalesce(o.offers, 0),
                 'interested_offers',   coalesce(o.interested_offers, 0),
                 'users',               coalesce(u.users, 0),
                 'primary_user_email',  u.primary_user_email,
                 'primary_user_name',   u.primary_user_name
               )
             )
        from institutions i
        left join app_stats   a on a.mfi_institution_id = i.id
        left join offer_stats o on o.mfi_institution_id = i.id
        left join user_stats  u on u.mfi_institution_id = i.id
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
revoke execute on function public.mfi_partner_stats(text[]) from public;
grant  execute on function public.mfi_partner_stats(text[]) to service_role;


-- ── Indexes ──────────────────────────────────────────────────
-- Every rollup above groups by institution.
create index if not exists financing_applications_mfi_idx
  on public.financing_applications (mfi_institution_id)
  where mfi_institution_id is not null;

create index if not exists mfi_application_offers_institution_idx
  on public.mfi_application_offers (mfi_institution_id);

create index if not exists profiles_mfi_partner_idx
  on public.profiles (mfi_institution_id)
  where mfi_institution_id is not null;
