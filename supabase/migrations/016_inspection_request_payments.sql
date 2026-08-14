-- Link standard payments to inspection requests.

alter table public.payments
  add column if not exists inspection_request_id uuid references public.inspection_requests(id) on delete cascade;

alter table public.payments
  drop constraint if exists payments_payment_type_check;

alter table public.payments
  add constraint payments_payment_type_check
  check (payment_type in ('down_payment', 'monthly', 'fee', 'inspection_fee'));

create index if not exists idx_payments_inspection_request
  on public.payments (inspection_request_id);

create unique index if not exists payments_one_inflight_per_inspection_request
  on public.payments (inspection_request_id, payment_type)
  where status in ('pending', 'processing');
