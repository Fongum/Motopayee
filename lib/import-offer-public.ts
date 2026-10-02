/**
 * The `import_offers` columns a member of the public may see.
 *
 * Exactly what /imports and /imports/offers/[id] render, and nothing else.
 * Deliberately absent: partner_name, external_ref, external_url, lot_number
 * and vin_last6 identify the source lot, so publishing them lets a buyer go
 * straight to the auction past MotoPayee; created_by is a staff profile id.
 *
 * One string literal, not a joined array: supabase-js parses the select list
 * at the type level, and a widened `string` makes every result an error type.
 */
export const IMPORT_OFFER_PUBLIC_COLUMNS =
  'id, status, headline, source_country, source_type, make, model, year, mileage_km, fuel_type, transmission, color, title_status, condition_summary, damage_summary, vehicle_price, auction_fee, inland_transport_fee, shipping_fee, insurance_fee, documentation_fee, motopayee_fee, estimated_customs_fee, estimated_port_fee, total_estimated_xaf, cover_image_url, media_json, auction_end_at, created_at';
