// ============================================================
// MotoPayee — Shared TypeScript Types
// ============================================================

// --------------- Roles ---------------
export type Role =
  | 'buyer'
  | 'seller_individual'
  | 'seller_dealer'
  | 'field_agent'
  | 'inspector'
  | 'verifier'
  | 'mfi_partner'
  | 'admin';

export type SellerRole = 'seller_individual' | 'seller_dealer';
export type StaffRole = 'field_agent' | 'inspector' | 'verifier' | 'admin';

// --------------- Profile ---------------
export interface Profile {
  id: string;
  auth_id: string | null;
  email: string;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  zone: string | null;
  role: Role;
  status: 'active' | 'inactive' | 'suspended';
  is_verified: boolean;
  mfi_institution_id: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// --------------- Favourite ---------------
export interface Favourite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
  listing?: Listing;
}

// --------------- MFI Institution ---------------
export interface MFIInstitution {
  id: string;
  name: string;
  code: string;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  active: boolean;
  created_at: string;
}

// --------------- Dealer ---------------
export interface Dealer {
  id: string;
  profile_id: string;
  dealer_name: string;
  dealer_code: string | null;
  address: string | null;
  city: string | null;
  zone: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  verified: boolean;
  created_at: string;
}

// --------------- Vehicle ---------------
export type ConditionGrade = 'A' | 'B' | 'C' | 'D';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'other';
export type TransmissionType = 'manual' | 'automatic' | 'other';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage_km: number;
  fuel_type: FuelType;
  transmission: TransmissionType;
  color: string | null;
  vin: string | null;
  engine_cc: number | null;
  seats: number | null;
  condition_grade: ConditionGrade | null;
  inspection_notes: string | null;
  created_at: string;
}

// --------------- Listing Status ---------------
export type ListingStatus =
  | 'draft'
  | 'ownership_submitted'
  | 'ownership_verified'
  | 'media_done'
  | 'inspection_scheduled'
  | 'inspected'
  | 'pricing_review'
  | 'published'
  | 'sold'
  | 'withdrawn';

// --------------- Listing ---------------
export interface Listing {
  id: string;
  vehicle_id: string;
  seller_id: string;
  dealer_id: string | null;
  status: ListingStatus;
  asking_price: number;
  suggested_price: number | null;
  mve_low: number | null;
  mve_high: number | null;
  price_band: 'green' | 'yellow' | 'red' | null;
  zone: string;
  city: string | null;
  description: string | null;
  financeable: boolean;
  published_at: string | null;
  sold_at: string | null;
  // Assignments
  field_agent_id: string | null;
  inspector_id: string | null;
  verifier_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: Vehicle;
  seller?: Profile;
  media?: MediaAsset[];
}

// --------------- Media Asset ---------------
export type MediaAssetType = 'photo' | 'video';

export interface MediaAsset {
  id: string;
  listing_id: string;
  asset_type: MediaAssetType;
  storage_path: string;
  bucket: string;
  display_order: number;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
}

// --------------- Inspection ---------------
export interface Inspection {
  id: string;
  listing_id: string;
  inspector_id: string;
  condition_grade: ConditionGrade;
  financeable: boolean;
  report_json: Record<string, unknown>;
  repair_estimate_low: number | null;
  repair_estimate_high: number | null;
  notes: string | null;
  inspected_at: string;
  created_at: string;
}

// --------------- Financing Application Status ---------------
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'docs_pending'
  | 'docs_received'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'withdrawn';

// --------------- Income Grade ---------------
export type IncomeGrade = 'A' | 'B' | 'C' | 'D';

// --------------- Financing Application ---------------
export interface FinancingApplication {
  id: string;
  listing_id: string;
  buyer_id: string;
  verifier_id: string | null;
  status: ApplicationStatus;
  income_grade: IncomeGrade | null;
  down_payment_percent: number | null;
  max_tenor: number | null;
  manual_review_required: boolean;
  notes: string | null;
  submitted_at: string | null;
  mfi_institution_id: string | null;
  decided_at: string | null;
  disbursed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  listing?: Listing;
  buyer?: Profile;
  documents?: Document[];
}

// --------------- Document ---------------
export type DocumentType =
  | 'ownership_title'
  | 'id_national'
  | 'id_passport'
  | 'income_proof'
  | 'bank_statement'
  | 'utility_bill'
  | 'other';

export interface Document {
  id: string;
  entity_type: 'listing' | 'application';
  entity_id: string;
  uploader_id: string;
  doc_type: DocumentType;
  storage_path: string;
  bucket: string;
  filename: string;
  content_type: string;
  file_size_bytes: number | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

// --------------- Zone Rule ---------------
export type ZoneCode = 'A' | 'B' | 'C';

export interface ZoneRule {
  id: string;
  zone: ZoneCode;
  income_grade: IncomeGrade;
  vehicle_price_band: 'green' | 'yellow' | 'red';
  condition_grade: ConditionGrade;
  financeable: boolean;
  down_payment_percent: number;
  max_tenor_months: number;
  manual_review_required: boolean;
  created_at: string;
  updated_at: string;
}

// --------------- Payment ---------------
export type PaymentStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';
export type PaymentProvider = 'mtn_momo' | 'orange_money';
export type PaymentType = 'down_payment' | 'full_payment' | 'installment';

export interface Payment {
  id: string;
  application_id: string;
  buyer_id: string;
  amount: number;
  currency: string;
  payment_type: PaymentType;
  provider: PaymentProvider;
  phone: string;
  external_ref: string | null;
  status: PaymentStatus;
  initiated_at: string;
  completed_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

// --------------- Import Request ---------------
export type ImportRequestMode = 'offer' | 'custom';
export type ImportBodyType = 'sedan' | 'suv' | 'pickup' | 'hatchback' | 'van' | 'coupe' | 'wagon' | 'other';
export type ImportRequestStatus =
  | 'draft'
  | 'submitted'
  | 'reviewing'
  | 'quoted'
  | 'accepted'
  | 'cancelled'
  | 'expired';

export interface ImportRequest {
  id: string;
  buyer_id: string;
  offer_id: string | null;
  mode: ImportRequestMode;
  source_country: string;
  make: string;
  model: string | null;
  year_min: number | null;
  year_max: number | null;
  budget_max_xaf: number;
  body_type: ImportBodyType | null;
  fuel_type: FuelType | null;
  transmission: TransmissionType | null;
  color_preferences: string | null;
  notes: string | null;
  status: ImportRequestStatus;
  created_at: string;
  updated_at: string;
  buyer?: Profile;
  offer?: ImportOffer;
  quotes?: ImportQuote[];
}

// --------------- Import Offer ---------------
export type ImportOfferStatus = 'draft' | 'active' | 'reserved' | 'withdrawn' | 'expired';
export type ImportSourceType = 'auction' | 'dealer' | 'private';

export interface ImportOffer {
  id: string;
  partner_name: string;
  source_country: string;
  source_type: ImportSourceType;
  external_ref: string | null;
  external_url: string | null;
  lot_number: string | null;
  status: ImportOfferStatus;
  headline: string;
  make: string;
  model: string;
  year: number;
  mileage_km: number | null;
  fuel_type: FuelType | null;
  transmission: TransmissionType | null;
  color: string | null;
  vin_last6: string | null;
  title_status: string | null;
  condition_summary: string | null;
  damage_summary: string | null;
  vehicle_price: number;
  auction_fee: number;
  inland_transport_fee: number;
  shipping_fee: number;
  insurance_fee: number;
  documentation_fee: number;
  motopayee_fee: number;
  estimated_customs_fee: number;
  estimated_port_fee: number;
  total_estimated_xaf: number;
  cover_image_url: string | null;
  media_json: Array<Record<string, unknown>>;
  auction_end_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// --------------- Import Quote ---------------
export type ImportQuoteStatus =
  | 'draft'
  | 'sent'
  | 'superseded'
  | 'expired'
  | 'accepted'
  | 'rejected';

export interface ImportQuote {
  id: string;
  request_id: string;
  partner_name: string;
  currency: string;
  fx_rate_to_xaf: number | null;
  vehicle_price: number;
  auction_fee: number;
  inland_transport_fee: number;
  shipping_fee: number;
  insurance_fee: number;
  documentation_fee: number;
  motopayee_fee: number;
  estimated_customs_fee: number;
  estimated_port_fee: number;
  total_estimated_xaf: number;
  reservation_deposit_amount: number;
  quote_terms: string | null;
  expires_at: string;
  quote_version: number;
  status: ImportQuoteStatus;
  created_by: string;
  created_at: string;
}

// --------------- Import Order ---------------
export type ClearingMode = 'self_clear' | 'broker_assist';
export type ImportOrderStatus =
  | 'quote_sent'
  | 'deposit_pending'
  | 'deposit_paid'
  | 'purchase_authorized'
  | 'purchased'
  | 'docs_pending'
  | 'shipping_booked'
  | 'in_transit'
  | 'arrived_cameroon'
  | 'ready_for_clearing'
  | 'clearing_in_progress'
  | 'completed'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded'
  | 'disputed';

export interface ImportOrder {
  id: string;
  buyer_id: string;
  request_id: string;
  accepted_quote_id: string;
  partner_name: string;
  status: ImportOrderStatus;
  clearing_mode: ClearingMode;
  destination_port: string | null;
  destination_city: string | null;
  reservation_deposit_amount: number | null;
  purchase_amount_due: number | null;
  shipping_amount_due: number | null;
  final_amount_due: number | null;
  currency: string;
  fx_rate_locked: number | null;
  buyer_acknowledged_terms: boolean;
  purchased_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  accepted_quote?: ImportQuote;
  buyer?: Profile;
  request?: ImportRequest;
  shipments?: ImportShipment[];
  documents?: ImportDocument[];
}

// --------------- Import Payment ---------------
export type ImportPaymentType =
  | 'reservation_deposit'
  | 'purchase_balance'
  | 'shipping_fee'
  | 'service_fee'
  | 'refund';

export interface ImportPayment {
  id: string;
  order_id: string;
  buyer_id: string;
  amount: number;
  currency: string;
  payment_type: ImportPaymentType;
  provider: PaymentProvider | 'cash' | 'bank_transfer';
  phone: string;
  external_ref: string | null;
  status: PaymentStatus;
  initiated_at: string;
  completed_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

// --------------- Import Shipment ---------------
export type ImportShipmentStatus = 'draft' | 'booked' | 'departed' | 'arrived' | 'released' | 'closed';

export interface ImportShipment {
  id: string;
  order_id: string;
  carrier_name: string;
  container_type: string | null;
  container_no: string | null;
  booking_ref: string | null;
  bill_of_lading_no: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  etd: string | null;
  eta: string | null;
  actual_departure_at: string | null;
  actual_arrival_at: string | null;
  status: ImportShipmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --------------- Import Document ---------------
export type ImportDocumentType =
  | 'auction_invoice'
  | 'bill_of_sale'
  | 'title'
  | 'partner_condition_report'
  | 'export_certificate'
  | 'insurance_certificate'
  | 'bill_of_lading'
  | 'ectn'
  | 'fimex_record'
  | 'customs_notice'
  | 'delivery_note'
  | 'other';

export interface ImportDocument {
  id: string;
  order_id: string;
  shipment_id: string | null;
  uploader_id: string;
  doc_type: ImportDocumentType;
  storage_path: string;
  bucket: string;
  filename: string;
  content_type: string;
  file_size_bytes: number | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

// --------------- Audit Log ---------------
export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: Role;
  action: string;
  entity_type: string;
  entity_id: string;
  meta: Record<string, unknown>;
  created_at: string;
}

// --------------- Eligibility Result ---------------
export interface EligibilityResult {
  financeable: boolean;
  down_payment_percent: number;
  max_tenor: number;
  manual_review_required: boolean;
}

// --------------- MVE Result ---------------
export interface MVEResult {
  mve_low: number;
  mve_high: number;
  suggested_price: number;
}

export type PriceBand = 'green' | 'yellow' | 'red';
