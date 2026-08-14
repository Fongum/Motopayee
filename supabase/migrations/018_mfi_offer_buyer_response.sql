-- Buyer response signal for competing MFI offers.

alter table public.mfi_application_offers
  add column if not exists buyer_response text
    check (buyer_response in ('interested', 'not_interested')),
  add column if not exists buyer_responded_at timestamptz;

create index if not exists mfi_application_offers_buyer_response_idx
  on public.mfi_application_offers (application_id, buyer_response)
  where buyer_response is not null;
