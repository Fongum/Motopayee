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
  decided_at: string | null;
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
