-- 014_payment_idempotency.sql
--
-- Backstop against duplicate / double-charge payments.
--
-- The application layer checks for an existing in-flight payment before
-- creating a new one, but that check has a race window: two concurrent
-- requests (double-click, client retry) can both pass the check and both
-- insert a `pending` row, firing two MoMo prompts to the buyer's phone.
--
-- These partial unique indexes let Postgres enforce "at most one in-flight
-- payment per (entity, payment_type)". A second concurrent insert fails with
-- a unique-violation, which the route translates into "a payment is already in
-- progress" instead of charging twice. Only active statuses are covered, so a
-- new attempt is allowed after a prior one fails/cancels, and recurring
-- (e.g. monthly) payments are unaffected once the previous one settles.
--
-- NOTE: if existing data already contains duplicate pending/processing rows for
-- the same key, these CREATE statements will fail — resolve those rows first.

create unique index if not exists payments_one_inflight_per_app_type
  on public.payments (application_id, payment_type)
  where status in ('pending', 'processing');

create unique index if not exists import_payments_one_inflight_per_order_type
  on public.import_payments (order_id, payment_type)
  where status in ('pending', 'processing');
