-- ============================================================
-- Migration 045 — Dealer program (the "Trusted Dealer" label)
--
-- docs/trust-verification-policy.md defines Trusted Dealer as "MotoPayee has
-- approved the dealer for the pilot or partner program and the dealer has
-- agreed to marketplace standards", with seven minimum requirements. The /trust
-- page already describes the label publicly, but nothing could earn it:
-- `dealers.verified` has existed since migration 001 and has never been
-- written or read.
--
-- This records each requirement as its own column, so an approval is backed by
-- evidence that says who confirmed what and when, rather than a bare boolean.
--
-- Requirement -> column(s):
--   Dealer/business name captured           dealer_name (already not null)
--   Owner or manager contact confirmed      manager_name, manager_phone,
--                                           manager_contact_confirmed_at
--   Inventory contact person assigned       inventory_contact_name,
--                                           inventory_contact_phone
--   Agrees to listing accuracy              agreed_listing_accuracy_at
--   Agrees to update sold/unavailable       agreed_sold_updates_at
--   Agrees to lead handling expectations    agreed_lead_handling_at
--   Agrees not to make false financeable    agreed_no_false_financeable_at
--     claims
--
-- The CHECK makes `verified = true` impossible without all of them, so the
-- badge cannot outrun its evidence even through a direct write. Every existing
-- row has verified = false (nothing ever set it), so adding it cannot fail.
--
-- Idempotent: columns use `if not exists`; the constraint is dropped first.
-- ============================================================

alter table public.dealers
  add column if not exists manager_name                   text,
  add column if not exists manager_phone                  text,
  add column if not exists manager_contact_confirmed_at   timestamptz,
  add column if not exists inventory_contact_name         text,
  add column if not exists inventory_contact_phone        text,
  add column if not exists agreed_listing_accuracy_at     timestamptz,
  add column if not exists agreed_sold_updates_at         timestamptz,
  add column if not exists agreed_lead_handling_at        timestamptz,
  add column if not exists agreed_no_false_financeable_at timestamptz,
  add column if not exists program_notes                  text,
  add column if not exists verified_at                    timestamptz,
  add column if not exists verified_by                    uuid references public.profiles (id) on delete set null;

alter table public.dealers drop constraint if exists dealers_verified_requires_program;
alter table public.dealers add constraint dealers_verified_requires_program check (
  not verified or (
        nullif(btrim(dealer_name), '')             is not null
    and nullif(btrim(manager_name), '')            is not null
    and nullif(btrim(manager_phone), '')           is not null
    and manager_contact_confirmed_at               is not null
    and nullif(btrim(inventory_contact_name), '')  is not null
    and nullif(btrim(inventory_contact_phone), '') is not null
    and agreed_listing_accuracy_at                 is not null
    and agreed_sold_updates_at                     is not null
    and agreed_lead_handling_at                    is not null
    and agreed_no_false_financeable_at             is not null
    and verified_at                                is not null
  )
);

-- Public listing pages look a seller's dealer row up by profile and read
-- `verified`; this covers that lookup without touching the table.
create index if not exists dealers_profile_verified_idx
  on public.dealers (profile_id, verified);
