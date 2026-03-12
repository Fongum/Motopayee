# MotoPayee Assisted Import MVP

## Goal

Launch a controlled `US -> Cameroon` import product backed by trusted sourcing partners without weakening MotoPayee's current promise around verified local inventory.

This should not be built as a normal marketplace listing flow. The existing app assumes:

- local stock that can be inspected and published
- financing tied to a published listing
- payments tied to approved financing applications

Relevant current references:

- `lib/types.ts`
- `app/api/applications/route.ts`
- `app/api/payments/request/route.ts`
- `supabase/migrations/002_listings.sql`

## Recommendation

Ship this as `MotoPayee Assisted Import`, not as a generic cross-border listing feature.

Phase 1 scope:

- one corridor only: `United States -> Cameroon`
- one trusted partner or a very small partner set
- admin-managed sourcing and shipment updates
- buyer can choose `self_clear` or `broker_assist`
- no loan disbursement before vehicle arrival and verification in Cameroon

Do not launch these in MVP:

- open seller self-service from multiple countries
- automatic customs promises
- import flow merged into normal `listings`
- full payment upfront without milestone control

## Why Separate From Local Listings

The current `listings` model is built for physical vehicles already inside MotoPayee's local operating flow. It carries local workflow assumptions such as inspection, publishability, and financeability.

For imports, those assumptions are false until later in the process:

- the vehicle is not yet in Cameroon
- MotoPayee has not physically inspected it
- shipping and customs timing can move
- final landed cost can drift if the quote is not frozen

If import inventory is pushed into normal listings too early, users will assume the same certainty level as local stock.

## Operating Constraints

The product should reflect the current official process rather than pretending import is simple.

Important current signals:

- FIMEX registration has had active process changes and training into early 2026.
- The new CNCC/CNSC import ECTN platform went live on 1 January 2025.
- Shipping documents for Cameroon-bound cargo now require extra details including HS code and first year of registration for imported vehicles.
- Registration and stamp duties for used vehicles are being handled more directly through CAMCIS-linked customs flows.

Official references:

- Cameroon Trade Hub: https://www.cameroontradehub.cm/article/273/en
- CNCC ECTN process: https://www.cncc.cm/en/besc
- CNCC ECTN platform release: https://www.cncc.cm/en/article/release-852
- Cameroon Trade Hub notice to shippers: https://www.cameroontradehub.cm/article/187/en
- Cameroon Trade Hub CAMCIS update: https://cameroontradehub.cm/article/158/en

Product implication:

- MotoPayee must track documents and milestones explicitly.
- Quotes need expiry dates and disclaimers.
- Buyer-managed clearing should be a mode, not a hand-wave.

## MVP Product Shape

### Entry Modes

Build two buyer entry paths:

1. `Curated Import Offers`
2. `Request A Car`

`Curated Import Offers` are vehicles your US partner can source or has identified from auction/dealer inventory.

`Request A Car` is a lead form for buyers who specify budget, make, model, year range, and preferences.

For MVP, both flows should converge into the same quote and order pipeline.

### Customer Promise

MotoPayee promises:

- vetted sourcing partner
- transparent quote breakdown
- document and shipment tracking
- milestone updates
- optional clearing support handoff

MotoPayee does not promise:

- fixed customs amount unless explicitly frozen
- guaranteed delivery date
- local roadworthy condition before arrival
- financing disbursement before arrival

## User Flow

### Buyer Flow

1. Buyer opens `/imports`.
2. Buyer either browses curated offers or submits a sourcing request.
3. MotoPayee sends a quote with full cost breakdown and quote expiry.
4. Buyer accepts the quote and pays a reservation deposit.
5. MotoPayee confirms purchase from the US partner.
6. MotoPayee uploads source documents and shipment milestones.
7. Buyer pays later milestones according to the order terms.
8. When the vehicle arrives, buyer either:
   - clears personally, or
   - uses broker assistance
9. After release and handoff, the order is completed.

### Admin Flow

1. Admin creates or imports partner offers.
2. Admin reviews buyer requests.
3. Admin issues or revises quotes.
4. Admin confirms deposit receipt.
5. Admin marks order as purchased.
6. Admin uploads title, invoice, bill of sale, inspection or auction report, shipping documents.
7. Admin updates shipment milestones.
8. Admin closes the order after clearing handoff or completion.

### Partner Flow

Do not build a partner portal in MVP.

Reason:

- your trusted US partner can send inventory and documents off-platform initially
- admin-only operations are faster to build
- this avoids auth, training, and partner support overhead in phase 1

Partner self-service can be phase 2 after the workflow is stable.

## Recommended Data Model

Keep imports separate from normal marketplace listings.

### 1. `import_offers`

Represents a sourceable vehicle or auction lot.

Suggested columns:

- `id`
- `partner_id`
- `source_country`
- `source_type` (`auction`, `dealer`, `private`)
- `external_ref`
- `external_url`
- `lot_number`
- `status` (`draft`, `active`, `reserved`, `purchased`, `withdrawn`, `expired`)
- `headline`
- `make`
- `model`
- `year`
- `mileage_km`
- `fuel_type`
- `transmission`
- `color`
- `vin_last6`
- `title_status`
- `condition_summary`
- `damage_summary`
- `auction_end_at`
- `media_json`
- `pricing_snapshot_json`
- `created_at`
- `updated_at`

Notes:

- Keep source vehicle data denormalized here.
- Do not insert these into `vehicles` or `listings` yet.

### 2. `import_requests`

Represents buyer demand, whether linked to an offer or free-form.

Suggested columns:

- `id`
- `buyer_id`
- `offer_id` nullable
- `mode` (`offer`, `custom`)
- `source_country`
- `make`
- `model`
- `year_min`
- `year_max`
- `budget_max_xaf`
- `body_type`
- `fuel_type`
- `transmission`
- `color_preferences`
- `notes`
- `status` (`draft`, `submitted`, `reviewing`, `quoted`, `accepted`, `cancelled`, `expired`)
- `created_at`
- `updated_at`

### 3. `import_quotes`

Snapshot of the commercial proposal. This is critical because prices can move.

Suggested columns:

- `id`
- `request_id`
- `offer_id` nullable
- `partner_id`
- `currency`
- `fx_rate_to_xaf`
- `vehicle_price`
- `auction_fee`
- `inland_transport_fee`
- `shipping_fee`
- `insurance_fee`
- `documentation_fee`
- `motopayee_fee`
- `estimated_customs_fee`
- `estimated_port_fee`
- `total_estimated_xaf`
- `quote_terms`
- `expires_at`
- `quote_version`
- `created_by`
- `created_at`

### 4. `import_orders`

Created once a quote is accepted.

Suggested columns:

- `id`
- `buyer_id`
- `request_id`
- `accepted_quote_id`
- `partner_id`
- `status`
- `clearing_mode` (`self_clear`, `broker_assist`)
- `destination_port`
- `destination_city`
- `reservation_deposit_amount`
- `purchase_amount_due`
- `shipping_amount_due`
- `final_amount_due`
- `currency`
- `fx_rate_locked`
- `buyer_acknowledged_terms`
- `purchased_at`
- `arrived_at`
- `completed_at`
- `cancelled_at`
- `cancellation_reason`
- `created_at`
- `updated_at`

Recommended order statuses:

- `quote_sent`
- `deposit_pending`
- `deposit_paid`
- `purchase_authorized`
- `purchased`
- `docs_pending`
- `shipping_booked`
- `in_transit`
- `arrived_cameroon`
- `ready_for_clearing`
- `clearing_in_progress`
- `completed`
- `cancelled`
- `refund_pending`
- `refunded`
- `disputed`

### 5. `import_shipments`

Tracks logistics status and arrival data.

Suggested columns:

- `id`
- `order_id`
- `carrier_name`
- `container_type`
- `container_no`
- `booking_ref`
- `bill_of_lading_no`
- `port_of_loading`
- `port_of_discharge`
- `etd`
- `eta`
- `actual_departure_at`
- `actual_arrival_at`
- `status` (`draft`, `booked`, `departed`, `arrived`, `released`, `closed`)
- `notes`
- `created_at`
- `updated_at`

### 6. `import_documents`

Separate from current generic documents table unless you want to generalize it carefully.

Suggested columns:

- `id`
- `order_id`
- `shipment_id` nullable
- `uploader_id`
- `doc_type`
- `storage_path`
- `bucket`
- `filename`
- `content_type`
- `verified`
- `verified_by`
- `verified_at`
- `created_at`

Recommended `doc_type` values:

- `auction_invoice`
- `bill_of_sale`
- `title`
- `partner_condition_report`
- `export_certificate`
- `insurance_certificate`
- `bill_of_lading`
- `ectn`
- `fimex_record`
- `customs_notice`
- `delivery_note`
- `other`

### 7. `import_payments`

Do not overload current `payments` in MVP. The existing flow is tied to financing applications.

Suggested columns:

- `id`
- `order_id`
- `buyer_id`
- `amount`
- `currency`
- `payment_type`
- `provider`
- `phone`
- `status`
- `external_ref`
- `meta`
- `initiated_at`
- `completed_at`
- `created_at`

Recommended `payment_type` values:

- `reservation_deposit`
- `purchase_balance`
- `shipping_fee`
- `service_fee`
- `refund`

## UI / Screen Plan

### Buyer Screens

- `/imports`
  - curated offers
  - CTA for custom request
- `/imports/request`
  - buyer sourcing request form
- `/imports/offers/[id]`
  - offer details, source disclaimers, quote request
- `/me/import-orders`
  - list of buyer import orders
- `/me/import-orders/[id]`
  - status timeline
  - quote breakdown
  - documents
  - shipment tracking
  - payment actions
  - clearing mode and next steps

### Admin Screens

- `/admin/imports`
  - overview metrics
- `/admin/imports/offers`
  - create and manage curated offers
- `/admin/imports/requests`
  - triage buyer demand
- `/admin/imports/quotes/[id]`
  - build and send quote
- `/admin/imports/orders`
  - import order pipeline
- `/admin/imports/orders/[id]`
  - timeline
  - documents
  - shipment updates
  - payment history

### Partner Screens

Skip in MVP.

## API Plan

Suggested routes:

- `GET /api/imports/offers`
- `GET /api/imports/offers/[id]`
- `POST /api/imports/requests`
- `GET /api/imports/orders/[id]`
- `POST /api/imports/orders/[id]/accept-quote`
- `POST /api/imports/orders/[id]/payments/request`
- `GET /api/imports/orders/[id]/payments`
- `POST /api/admin/imports/offers`
- `PATCH /api/admin/imports/offers/[id]`
- `POST /api/admin/imports/quotes`
- `PATCH /api/admin/imports/orders/[id]/status`
- `POST /api/admin/imports/orders/[id]/documents`
- `POST /api/admin/imports/orders/[id]/shipments`
- `PATCH /api/admin/imports/shipments/[id]`

## Payment Rules

### Rule 1: Quote Acceptance

Buyer cannot proceed until:

- quote is active
- quote has not expired
- buyer has accepted terms

### Rule 2: Deposit

Reservation deposit should be the first actual payment.

Recommendation:

- use either a fixed minimum deposit or a percentage
- mark the quote as reserved only after confirmed payment

### Rule 3: Purchase Authorization

Partner must not buy the car until:

- deposit is confirmed
- buyer accepts non-refundable conditions after purchase authorization

### Rule 4: Post-Purchase Commitment

After the partner buys the vehicle:

- reservation deposit becomes committed
- cancellation terms become stricter
- refund is only allowed if MotoPayee or partner fails to perform, or if title/document checks fail

### Rule 5: Shipment Milestones

At minimum, support:

- deposit
- purchase balance
- shipping fee

Do not collect customs-clearing money in MVP if buyer chose `self_clear`.

### Rule 6: Financing

Do not reuse the current financing application flow before arrival.

Reason:

- `app/api/applications/route.ts` requires a published listing
- `app/api/payments/request/route.ts` assumes an approved financing application

Safer approach:

- allow optional financing pre-qualification only as an informational lead
- only create a true financing application after the vehicle is in Cameroon and can become a normal listing

## Rules For Buyer-Managed Clearing

If buyer selects `self_clear`, the product still needs structure.

MotoPayee should provide:

- document checklist
- handoff confirmation
- arrival notice
- timeline of shipment milestones
- optional broker contact

MotoPayee should explicitly disclaim:

- customs processing time
- storage charges caused by buyer delay
- penalties from missing buyer-side compliance

MVP safeguard:

- require buyer acknowledgement before order confirmation

## Terms And Risk Controls

Must-have controls:

- quote expiry timestamp
- FX rate snapshot on quote
- clear definition of estimated vs fixed costs
- title/document verification before partner purchase when possible
- admin audit log for all status changes
- stored buyer acceptance of terms

Strongly recommended:

- restrict source countries to one per phase
- restrict partner count at launch
- no promise of local inspection before arrival
- no generic "fully cleared" promise unless MotoPayee controls clearing

## Suggested Build Order

### Sprint 1

- schema for `import_requests`, `import_quotes`, `import_orders`
- buyer request form
- admin request queue
- admin quote creation

### Sprint 2

- `import_offers`
- public imports catalog
- order acceptance
- import payments

### Sprint 3

- shipment tracking
- documents
- buyer order detail page
- admin order operations page

### Sprint 4

- optional broker-assist mode
- post-arrival conversion into a normal listing
- optional financing pre-qualification messaging

## Minimal Technical Strategy

To minimize regression risk:

- keep import entities in separate tables
- keep import routes under `/api/imports` and `/api/admin/imports`
- create separate buyer pages under `/imports` and `/me/import-orders`
- create separate payment handling for import orders

Only after this flow stabilizes should you consider:

- merging imported-arrived vehicles into normal `listings`
- opening partner self-service
- adding more source countries

## Decision Summary

This is worth building because you have a trusted US sourcing partner.

The correct MVP is:

- controlled
- corridor-specific
- partner-backed
- quote-driven
- milestone-paid
- operationally separate from local listings and financing

That gives MotoPayee a realistic path into import commerce without confusing users about what is already in Cameroon versus what is still in transit.
