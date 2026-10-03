
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_logs": {
                  Row: {
                    "action": string,"actor_email": string,"actor_id": string,"actor_role": string,"created_at": string,"entity_id": string,"entity_type": string,"id": string,"meta": NonNullable<Json>
                  }
                  Insert: {
                    "action": string,"actor_email": string,"actor_id": string,"actor_role": string,"created_at"?: string,"entity_id": string,"entity_type": string,"id"?: string,"meta"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_email"?: string,"actor_id"?: string,"actor_role"?: string,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: string,"meta"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"browsing_history": {
                  Row: {
                    "entity_id": string,"entity_type": string,"id": string,"user_id": string,"viewed_at": string
                  }
                  Insert: {
                    "entity_id": string,"entity_type": string,"id"?: string,"user_id": string,"viewed_at"?: string
                  }
                  Update: {
                    "entity_id"?: string,"entity_type"?: string,"id"?: string,"user_id"?: string,"viewed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "browsing_history_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_events": {
                  Row: {
                    "actor_id": string | null,"channel": string,"created_at": string,"date_day": string,"hire_listing_id": string | null,"id": string,"listing_id": string | null,"surface": string,"visitor_key": string | null
                  }
                  Insert: {
                    "actor_id"?: string | null,"channel": string,"created_at"?: string,"date_day"?: string,"hire_listing_id"?: string | null,"id"?: string,"listing_id"?: string | null,"surface": string,"visitor_key"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"channel"?: string,"created_at"?: string,"date_day"?: string,"hire_listing_id"?: string | null,"id"?: string,"listing_id"?: string | null,"surface"?: string,"visitor_key"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_events_hire_listing_id_fkey"
      columns: ["hire_listing_id"]
isOneToOne: false
      referencedRelation: "hire_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_events_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "created_at": string,"hire_listing_id": string | null,"id": string,"last_message_at": string,"listing_id": string | null,"participant_a": string,"participant_b": string
                  }
                  Insert: {
                    "created_at"?: string,"hire_listing_id"?: string | null,"id"?: string,"last_message_at"?: string,"listing_id"?: string | null,"participant_a": string,"participant_b": string
                  }
                  Update: {
                    "created_at"?: string,"hire_listing_id"?: string | null,"id"?: string,"last_message_at"?: string,"listing_id"?: string | null,"participant_a"?: string,"participant_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_hire_listing_id_fkey"
      columns: ["hire_listing_id"]
isOneToOne: false
      referencedRelation: "hire_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_participant_a_fkey"
      columns: ["participant_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_participant_b_fkey"
      columns: ["participant_b"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dealers": {
                  Row: {
                    "address": string | null,"city": string | null,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"dealer_code": string | null,"dealer_name": string,"id": string,"profile_id": string,"verified": boolean,"zone": string | null
                  }
                  Insert: {
                    "address"?: string | null,"city"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"dealer_code"?: string | null,"dealer_name": string,"id"?: string,"profile_id": string,"verified"?: boolean,"zone"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"city"?: string | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"dealer_code"?: string | null,"dealer_name"?: string,"id"?: string,"profile_id"?: string,"verified"?: boolean,"zone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dealers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "bucket": string,"content_type": string,"created_at": string,"doc_type": string,"entity_id": string,"entity_type": string,"file_size_bytes": number | null,"filename": string,"id": string,"storage_path": string,"uploader_id": string,"verified": boolean,"verified_at": string | null,"verified_by": string | null
                  }
                  Insert: {
                    "bucket"?: string,"content_type": string,"created_at"?: string,"doc_type": string,"entity_id": string,"entity_type": string,"file_size_bytes"?: number | null,"filename": string,"id"?: string,"storage_path": string,"uploader_id": string,"verified"?: boolean,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "bucket"?: string,"content_type"?: string,"created_at"?: string,"doc_type"?: string,"entity_id"?: string,"entity_type"?: string,"file_size_bytes"?: number | null,"filename"?: string,"id"?: string,"storage_path"?: string,"uploader_id"?: string,"verified"?: boolean,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_uploader_id_fkey"
      columns: ["uploader_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"favourites": {
                  Row: {
                    "created_at": string,"id": string,"listing_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"listing_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"listing_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favourites_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favourites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"finance_commissions": {
                  Row: {
                    "application_id": string,"buyer_id": string | null,"commission_amount_xaf": number,"commission_rate_percent": number,"created_at": string,"created_by": string | null,"due_at": string | null,"id": string,"listing_id": string | null,"mfi_institution_id": string | null,"notes": string | null,"paid_at": string | null,"status": string,"updated_at": string,"vehicle_value_xaf": number
                  }
                  Insert: {
                    "application_id": string,"buyer_id"?: string | null,"commission_amount_xaf"?: number,"commission_rate_percent"?: number,"created_at"?: string,"created_by"?: string | null,"due_at"?: string | null,"id"?: string,"listing_id"?: string | null,"mfi_institution_id"?: string | null,"notes"?: string | null,"paid_at"?: string | null,"status"?: string,"updated_at"?: string,"vehicle_value_xaf"?: number
                  }
                  Update: {
                    "application_id"?: string,"buyer_id"?: string | null,"commission_amount_xaf"?: number,"commission_rate_percent"?: number,"created_at"?: string,"created_by"?: string | null,"due_at"?: string | null,"id"?: string,"listing_id"?: string | null,"mfi_institution_id"?: string | null,"notes"?: string | null,"paid_at"?: string | null,"status"?: string,"updated_at"?: string,"vehicle_value_xaf"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "finance_commissions_application_id_fkey"
      columns: ["application_id"]
isOneToOne: true
      referencedRelation: "financing_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_commissions_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_commissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_commissions_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_commissions_mfi_institution_id_fkey"
      columns: ["mfi_institution_id"]
isOneToOne: false
      referencedRelation: "mfi_institutions"
      referencedColumns: ["id"]
    }
                  ]
                },"financing_applications": {
                  Row: {
                    "buyer_id": string,"created_at": string,"decided_at": string | null,"disbursed_at": string | null,"down_payment_percent": number | null,"follow_up_actor_id": string | null,"follow_up_notes": string | null,"follow_up_status": string,"follow_up_updated_at": string | null,"id": string,"income_grade": string | null,"listing_id": string,"manual_review_required": boolean,"max_tenor": number | null,"mfi_institution_id": string | null,"next_follow_up_at": string | null,"notes": string | null,"status": string,"submitted_at": string | null,"updated_at": string,"verifier_id": string | null
                  }
                  Insert: {
                    "buyer_id": string,"created_at"?: string,"decided_at"?: string | null,"disbursed_at"?: string | null,"down_payment_percent"?: number | null,"follow_up_actor_id"?: string | null,"follow_up_notes"?: string | null,"follow_up_status"?: string,"follow_up_updated_at"?: string | null,"id"?: string,"income_grade"?: string | null,"listing_id": string,"manual_review_required"?: boolean,"max_tenor"?: number | null,"mfi_institution_id"?: string | null,"next_follow_up_at"?: string | null,"notes"?: string | null,"status"?: string,"submitted_at"?: string | null,"updated_at"?: string,"verifier_id"?: string | null
                  }
                  Update: {
                    "buyer_id"?: string,"created_at"?: string,"decided_at"?: string | null,"disbursed_at"?: string | null,"down_payment_percent"?: number | null,"follow_up_actor_id"?: string | null,"follow_up_notes"?: string | null,"follow_up_status"?: string,"follow_up_updated_at"?: string | null,"id"?: string,"income_grade"?: string | null,"listing_id"?: string,"manual_review_required"?: boolean,"max_tenor"?: number | null,"mfi_institution_id"?: string | null,"next_follow_up_at"?: string | null,"notes"?: string | null,"status"?: string,"submitted_at"?: string | null,"updated_at"?: string,"verifier_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "financing_applications_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financing_applications_follow_up_actor_id_fkey"
      columns: ["follow_up_actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financing_applications_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financing_applications_mfi_institution_id_fkey"
      columns: ["mfi_institution_id"]
isOneToOne: false
      referencedRelation: "mfi_institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financing_applications_verifier_id_fkey"
      columns: ["verifier_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"hire_bookings": {
                  Row: {
                    "cancellation_reason": string | null,"cancelled_at": string | null,"completed_at": string | null,"confirmed_at": string | null,"created_at": string,"daily_rate": number,"deposit_amount": number,"driver_daily_rate": number | null,"dropoff_location": string | null,"end_date": string,"hire_listing_id": string,"hire_type": string,"id": string,"owner_id": string,"owner_notes": string | null,"payment_phone": string | null,"payment_provider": string | null,"payment_status": string,"pickup_location": string | null,"renter_id": string,"renter_notes": string | null,"start_date": string,"status": string,"total_amount": number,"total_days": number,"updated_at": string
                  }
                  Insert: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"daily_rate": number,"deposit_amount"?: number,"driver_daily_rate"?: number | null,"dropoff_location"?: string | null,"end_date": string,"hire_listing_id": string,"hire_type"?: string,"id"?: string,"owner_id": string,"owner_notes"?: string | null,"payment_phone"?: string | null,"payment_provider"?: string | null,"payment_status"?: string,"pickup_location"?: string | null,"renter_id": string,"renter_notes"?: string | null,"start_date": string,"status"?: string,"total_amount": number,"total_days": number,"updated_at"?: string
                  }
                  Update: {
                    "cancellation_reason"?: string | null,"cancelled_at"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"daily_rate"?: number,"deposit_amount"?: number,"driver_daily_rate"?: number | null,"dropoff_location"?: string | null,"end_date"?: string,"hire_listing_id"?: string,"hire_type"?: string,"id"?: string,"owner_id"?: string,"owner_notes"?: string | null,"payment_phone"?: string | null,"payment_provider"?: string | null,"payment_status"?: string,"pickup_location"?: string | null,"renter_id"?: string,"renter_notes"?: string | null,"start_date"?: string,"status"?: string,"total_amount"?: number,"total_days"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "hire_bookings_hire_listing_id_fkey"
      columns: ["hire_listing_id"]
isOneToOne: false
      referencedRelation: "hire_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hire_bookings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hire_bookings_renter_id_fkey"
      columns: ["renter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"hire_listing_media": {
                  Row: {
                    "asset_type": string,"bucket": string,"caption": string | null,"created_at": string,"display_order": number,"hire_listing_id": string,"id": string,"storage_path": string,"uploaded_by": string
                  }
                  Insert: {
                    "asset_type"?: string,"bucket"?: string,"caption"?: string | null,"created_at"?: string,"display_order"?: number,"hire_listing_id": string,"id"?: string,"storage_path": string,"uploaded_by": string
                  }
                  Update: {
                    "asset_type"?: string,"bucket"?: string,"caption"?: string | null,"created_at"?: string,"display_order"?: number,"hire_listing_id"?: string,"id"?: string,"storage_path"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "hire_listing_media_hire_listing_id_fkey"
      columns: ["hire_listing_id"]
isOneToOne: false
      referencedRelation: "hire_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hire_listing_media_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"hire_listings": {
                  Row: {
                    "address": string | null,"availability": string,"city": string,"color": string | null,"conditions": string | null,"created_at": string,"daily_rate": number,"dealer_id": string | null,"deposit_amount": number,"description": string | null,"driver_daily_rate": number | null,"engine_cc": number | null,"extra_km_charge": number | null,"features": Json | null,"fuel_type": string,"hire_type": string,"id": string,"insurance_included": boolean,"latitude": number | null,"longitude": number | null,"make": string,"max_hire_days": number | null,"mileage_limit_per_day_km": number | null,"min_hire_days": number,"model": string,"monthly_rate": number | null,"owner_id": string,"plate_number": string | null,"published_at": string | null,"seats": number | null,"status": string,"transmission": string,"updated_at": string,"weekly_rate": number | null,"year": number,"zone": string
                  }
                  Insert: {
                    "address"?: string | null,"availability"?: string,"city": string,"color"?: string | null,"conditions"?: string | null,"created_at"?: string,"daily_rate": number,"dealer_id"?: string | null,"deposit_amount"?: number,"description"?: string | null,"driver_daily_rate"?: number | null,"engine_cc"?: number | null,"extra_km_charge"?: number | null,"features"?: Json | null,"fuel_type"?: string,"hire_type"?: string,"id"?: string,"insurance_included"?: boolean,"latitude"?: number | null,"longitude"?: number | null,"make": string,"max_hire_days"?: number | null,"mileage_limit_per_day_km"?: number | null,"min_hire_days"?: number,"model": string,"monthly_rate"?: number | null,"owner_id": string,"plate_number"?: string | null,"published_at"?: string | null,"seats"?: number | null,"status"?: string,"transmission"?: string,"updated_at"?: string,"weekly_rate"?: number | null,"year": number,"zone"?: string
                  }
                  Update: {
                    "address"?: string | null,"availability"?: string,"city"?: string,"color"?: string | null,"conditions"?: string | null,"created_at"?: string,"daily_rate"?: number,"dealer_id"?: string | null,"deposit_amount"?: number,"description"?: string | null,"driver_daily_rate"?: number | null,"engine_cc"?: number | null,"extra_km_charge"?: number | null,"features"?: Json | null,"fuel_type"?: string,"hire_type"?: string,"id"?: string,"insurance_included"?: boolean,"latitude"?: number | null,"longitude"?: number | null,"make"?: string,"max_hire_days"?: number | null,"mileage_limit_per_day_km"?: number | null,"min_hire_days"?: number,"model"?: string,"monthly_rate"?: number | null,"owner_id"?: string,"plate_number"?: string | null,"published_at"?: string | null,"seats"?: number | null,"status"?: string,"transmission"?: string,"updated_at"?: string,"weekly_rate"?: number | null,"year"?: number,"zone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "hire_listings_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: false
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hire_listings_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"hire_service_fees": {
                  Row: {
                    "booking_value_xaf": number,"created_at": string,"created_by": string | null,"fee_amount_xaf": number,"fee_rate_percent": number,"hire_booking_id": string,"hire_listing_id": string | null,"id": string,"notes": string | null,"owner_id": string | null,"paid_at": string | null,"renter_id": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "booking_value_xaf"?: number,"created_at"?: string,"created_by"?: string | null,"fee_amount_xaf"?: number,"fee_rate_percent"?: number,"hire_booking_id": string,"hire_listing_id"?: string | null,"id"?: string,"notes"?: string | null,"owner_id"?: string | null,"paid_at"?: string | null,"renter_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "booking_value_xaf"?: number,"created_at"?: string,"created_by"?: string | null,"fee_amount_xaf"?: number,"fee_rate_percent"?: number,"hire_booking_id"?: string,"hire_listing_id"?: string | null,"id"?: string,"notes"?: string | null,"owner_id"?: string | null,"paid_at"?: string | null,"renter_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "hire_service_fees_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hire_service_fees_hire_booking_id_fkey"
      columns: ["hire_booking_id"]
isOneToOne: true
      referencedRelation: "hire_bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hire_service_fees_hire_listing_id_fkey"
      columns: ["hire_listing_id"]
isOneToOne: false
      referencedRelation: "hire_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hire_service_fees_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hire_service_fees_renter_id_fkey"
      columns: ["renter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"import_documents": {
                  Row: {
                    "bucket": string,"content_type": string,"created_at": string,"doc_type": string,"file_size_bytes": number | null,"filename": string,"id": string,"order_id": string,"shipment_id": string | null,"storage_path": string,"uploader_id": string,"verified": boolean,"verified_at": string | null,"verified_by": string | null
                  }
                  Insert: {
                    "bucket"?: string,"content_type": string,"created_at"?: string,"doc_type": string,"file_size_bytes"?: number | null,"filename": string,"id"?: string,"order_id": string,"shipment_id"?: string | null,"storage_path": string,"uploader_id": string,"verified"?: boolean,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "bucket"?: string,"content_type"?: string,"created_at"?: string,"doc_type"?: string,"file_size_bytes"?: number | null,"filename"?: string,"id"?: string,"order_id"?: string,"shipment_id"?: string | null,"storage_path"?: string,"uploader_id"?: string,"verified"?: boolean,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_documents_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "import_orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_documents_shipment_id_fkey"
      columns: ["shipment_id"]
isOneToOne: false
      referencedRelation: "import_shipments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_documents_uploader_id_fkey"
      columns: ["uploader_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_documents_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"import_offers": {
                  Row: {
                    "auction_end_at": string | null,"auction_fee": number,"color": string | null,"condition_summary": string | null,"cover_image_url": string | null,"created_at": string,"created_by": string | null,"damage_summary": string | null,"documentation_fee": number,"estimated_customs_fee": number,"estimated_port_fee": number,"external_ref": string | null,"external_url": string | null,"fuel_type": string | null,"headline": string,"id": string,"inland_transport_fee": number,"insurance_fee": number,"lot_number": string | null,"make": string,"media_json": NonNullable<Json>,"mileage_km": number | null,"model": string,"motopayee_fee": number,"partner_name": string,"shipping_fee": number,"source_country": string,"source_type": string,"status": string,"title_status": string | null,"total_estimated_xaf": number,"transmission": string | null,"updated_at": string,"vehicle_price": number,"vin_last6": string | null,"year": number
                  }
                  Insert: {
                    "auction_end_at"?: string | null,"auction_fee"?: number,"color"?: string | null,"condition_summary"?: string | null,"cover_image_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"damage_summary"?: string | null,"documentation_fee"?: number,"estimated_customs_fee"?: number,"estimated_port_fee"?: number,"external_ref"?: string | null,"external_url"?: string | null,"fuel_type"?: string | null,"headline": string,"id"?: string,"inland_transport_fee"?: number,"insurance_fee"?: number,"lot_number"?: string | null,"make": string,"media_json"?: NonNullable<Json>,"mileage_km"?: number | null,"model": string,"motopayee_fee"?: number,"partner_name": string,"shipping_fee"?: number,"source_country"?: string,"source_type"?: string,"status"?: string,"title_status"?: string | null,"total_estimated_xaf"?: number,"transmission"?: string | null,"updated_at"?: string,"vehicle_price"?: number,"vin_last6"?: string | null,"year": number
                  }
                  Update: {
                    "auction_end_at"?: string | null,"auction_fee"?: number,"color"?: string | null,"condition_summary"?: string | null,"cover_image_url"?: string | null,"created_at"?: string,"created_by"?: string | null,"damage_summary"?: string | null,"documentation_fee"?: number,"estimated_customs_fee"?: number,"estimated_port_fee"?: number,"external_ref"?: string | null,"external_url"?: string | null,"fuel_type"?: string | null,"headline"?: string,"id"?: string,"inland_transport_fee"?: number,"insurance_fee"?: number,"lot_number"?: string | null,"make"?: string,"media_json"?: NonNullable<Json>,"mileage_km"?: number | null,"model"?: string,"motopayee_fee"?: number,"partner_name"?: string,"shipping_fee"?: number,"source_country"?: string,"source_type"?: string,"status"?: string,"title_status"?: string | null,"total_estimated_xaf"?: number,"transmission"?: string | null,"updated_at"?: string,"vehicle_price"?: number,"vin_last6"?: string | null,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_offers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"import_orders": {
                  Row: {
                    "accepted_quote_id": string,"arrived_at": string | null,"buyer_acknowledged_terms": boolean,"buyer_id": string,"cancellation_reason": string | null,"cancelled_at": string | null,"clearing_mode": string,"completed_at": string | null,"created_at": string,"currency": string,"destination_city": string | null,"destination_port": string | null,"final_amount_due": number | null,"fx_rate_locked": number | null,"id": string,"partner_name": string,"purchase_amount_due": number | null,"purchased_at": string | null,"request_id": string,"reservation_deposit_amount": number | null,"shipping_amount_due": number | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "accepted_quote_id": string,"arrived_at"?: string | null,"buyer_acknowledged_terms"?: boolean,"buyer_id": string,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"clearing_mode"?: string,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"destination_city"?: string | null,"destination_port"?: string | null,"final_amount_due"?: number | null,"fx_rate_locked"?: number | null,"id"?: string,"partner_name": string,"purchase_amount_due"?: number | null,"purchased_at"?: string | null,"request_id": string,"reservation_deposit_amount"?: number | null,"shipping_amount_due"?: number | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_quote_id"?: string,"arrived_at"?: string | null,"buyer_acknowledged_terms"?: boolean,"buyer_id"?: string,"cancellation_reason"?: string | null,"cancelled_at"?: string | null,"clearing_mode"?: string,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"destination_city"?: string | null,"destination_port"?: string | null,"final_amount_due"?: number | null,"fx_rate_locked"?: number | null,"id"?: string,"partner_name"?: string,"purchase_amount_due"?: number | null,"purchased_at"?: string | null,"request_id"?: string,"reservation_deposit_amount"?: number | null,"shipping_amount_due"?: number | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_orders_accepted_quote_id_fkey"
      columns: ["accepted_quote_id"]
isOneToOne: true
      referencedRelation: "import_quotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_orders_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_orders_request_id_fkey"
      columns: ["request_id"]
isOneToOne: true
      referencedRelation: "import_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"import_payments": {
                  Row: {
                    "amount": number,"buyer_id": string,"completed_at": string | null,"created_at": string,"currency": string,"external_ref": string | null,"id": string,"initiated_at": string,"meta": NonNullable<Json>,"order_id": string,"payment_type": string,"phone": string,"provider": string,"status": string
                  }
                  Insert: {
                    "amount": number,"buyer_id": string,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"external_ref"?: string | null,"id"?: string,"initiated_at"?: string,"meta"?: NonNullable<Json>,"order_id": string,"payment_type"?: string,"phone": string,"provider": string,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"buyer_id"?: string,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"external_ref"?: string | null,"id"?: string,"initiated_at"?: string,"meta"?: NonNullable<Json>,"order_id"?: string,"payment_type"?: string,"phone"?: string,"provider"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_payments_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "import_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"import_quotes": {
                  Row: {
                    "auction_fee": number,"created_at": string,"created_by": string,"currency": string,"documentation_fee": number,"estimated_customs_fee": number,"estimated_port_fee": number,"expires_at": string,"fx_rate_to_xaf": number | null,"id": string,"inland_transport_fee": number,"insurance_fee": number,"motopayee_fee": number,"partner_name": string,"quote_terms": string | null,"quote_version": number,"request_id": string,"reservation_deposit_amount": number,"shipping_fee": number,"status": string,"total_estimated_xaf": number,"vehicle_price": number
                  }
                  Insert: {
                    "auction_fee"?: number,"created_at"?: string,"created_by": string,"currency"?: string,"documentation_fee"?: number,"estimated_customs_fee"?: number,"estimated_port_fee"?: number,"expires_at": string,"fx_rate_to_xaf"?: number | null,"id"?: string,"inland_transport_fee"?: number,"insurance_fee"?: number,"motopayee_fee"?: number,"partner_name": string,"quote_terms"?: string | null,"quote_version": number,"request_id": string,"reservation_deposit_amount"?: number,"shipping_fee"?: number,"status"?: string,"total_estimated_xaf"?: number,"vehicle_price"?: number
                  }
                  Update: {
                    "auction_fee"?: number,"created_at"?: string,"created_by"?: string,"currency"?: string,"documentation_fee"?: number,"estimated_customs_fee"?: number,"estimated_port_fee"?: number,"expires_at"?: string,"fx_rate_to_xaf"?: number | null,"id"?: string,"inland_transport_fee"?: number,"insurance_fee"?: number,"motopayee_fee"?: number,"partner_name"?: string,"quote_terms"?: string | null,"quote_version"?: number,"request_id"?: string,"reservation_deposit_amount"?: number,"shipping_fee"?: number,"status"?: string,"total_estimated_xaf"?: number,"vehicle_price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_quotes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_quotes_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "import_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"import_requests": {
                  Row: {
                    "body_type": string | null,"budget_max_xaf": number,"buyer_id": string,"color_preferences": string | null,"created_at": string,"fuel_type": string | null,"id": string,"make": string,"mode": string,"model": string | null,"notes": string | null,"offer_id": string | null,"source_country": string,"status": string,"transmission": string | null,"updated_at": string,"year_max": number | null,"year_min": number | null
                  }
                  Insert: {
                    "body_type"?: string | null,"budget_max_xaf": number,"buyer_id": string,"color_preferences"?: string | null,"created_at"?: string,"fuel_type"?: string | null,"id"?: string,"make": string,"mode"?: string,"model"?: string | null,"notes"?: string | null,"offer_id"?: string | null,"source_country"?: string,"status"?: string,"transmission"?: string | null,"updated_at"?: string,"year_max"?: number | null,"year_min"?: number | null
                  }
                  Update: {
                    "body_type"?: string | null,"budget_max_xaf"?: number,"buyer_id"?: string,"color_preferences"?: string | null,"created_at"?: string,"fuel_type"?: string | null,"id"?: string,"make"?: string,"mode"?: string,"model"?: string | null,"notes"?: string | null,"offer_id"?: string | null,"source_country"?: string,"status"?: string,"transmission"?: string | null,"updated_at"?: string,"year_max"?: number | null,"year_min"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_requests_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "import_requests_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "import_offers"
      referencedColumns: ["id"]
    }
                  ]
                },"import_shipments": {
                  Row: {
                    "actual_arrival_at": string | null,"actual_departure_at": string | null,"bill_of_lading_no": string | null,"booking_ref": string | null,"carrier_name": string,"container_no": string | null,"container_type": string | null,"created_at": string,"eta": string | null,"etd": string | null,"id": string,"notes": string | null,"order_id": string,"port_of_discharge": string | null,"port_of_loading": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "actual_arrival_at"?: string | null,"actual_departure_at"?: string | null,"bill_of_lading_no"?: string | null,"booking_ref"?: string | null,"carrier_name": string,"container_no"?: string | null,"container_type"?: string | null,"created_at"?: string,"eta"?: string | null,"etd"?: string | null,"id"?: string,"notes"?: string | null,"order_id": string,"port_of_discharge"?: string | null,"port_of_loading"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "actual_arrival_at"?: string | null,"actual_departure_at"?: string | null,"bill_of_lading_no"?: string | null,"booking_ref"?: string | null,"carrier_name"?: string,"container_no"?: string | null,"container_type"?: string | null,"created_at"?: string,"eta"?: string | null,"etd"?: string | null,"id"?: string,"notes"?: string | null,"order_id"?: string,"port_of_discharge"?: string | null,"port_of_loading"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_shipments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "import_orders"
      referencedColumns: ["id"]
    }
                  ]
                },"inspection_requests": {
                  Row: {
                    "created_at": string,"fee_xaf": number,"id": string,"listing_id": string,"notes": string | null,"preferred_window": string | null,"request_type": string,"requester_email": string | null,"requester_id": string | null,"requester_name": string,"requester_phone": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"fee_xaf"?: number,"id"?: string,"listing_id": string,"notes"?: string | null,"preferred_window"?: string | null,"request_type"?: string,"requester_email"?: string | null,"requester_id"?: string | null,"requester_name": string,"requester_phone": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"fee_xaf"?: number,"id"?: string,"listing_id"?: string,"notes"?: string | null,"preferred_window"?: string | null,"request_type"?: string,"requester_email"?: string | null,"requester_id"?: string | null,"requester_name"?: string,"requester_phone"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspection_requests_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspection_requests_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"inspections": {
                  Row: {
                    "condition_grade": string,"created_at": string,"financeable": boolean,"id": string,"inspected_at": string,"inspector_id": string,"listing_id": string,"notes": string | null,"repair_estimate_high": number | null,"repair_estimate_low": number | null,"report_json": NonNullable<Json>
                  }
                  Insert: {
                    "condition_grade": string,"created_at"?: string,"financeable"?: boolean,"id"?: string,"inspected_at"?: string,"inspector_id": string,"listing_id": string,"notes"?: string | null,"repair_estimate_high"?: number | null,"repair_estimate_low"?: number | null,"report_json"?: NonNullable<Json>
                  }
                  Update: {
                    "condition_grade"?: string,"created_at"?: string,"financeable"?: boolean,"id"?: string,"inspected_at"?: string,"inspector_id"?: string,"listing_id"?: string,"notes"?: string | null,"repair_estimate_high"?: number | null,"repair_estimate_low"?: number | null,"report_json"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "inspections_inspector_id_fkey"
      columns: ["inspector_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inspections_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"insurance_partners": {
                  Row: {
                    "active": boolean,"code": string,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"id": string,"logo_url": string | null,"name": string,"products": NonNullable<Json>
                  }
                  Insert: {
                    "active"?: boolean,"code": string,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"logo_url"?: string | null,"name": string,"products"?: NonNullable<Json>
                  }
                  Update: {
                    "active"?: boolean,"code"?: string,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"logo_url"?: string | null,"name"?: string,"products"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"insurance_quotes": {
                  Row: {
                    "annual_premium_xaf": number,"coverage_summary": string | null,"created_at": string,"hire_booking_id": string | null,"hire_listing_id": string | null,"id": string,"listing_id": string | null,"monthly_premium_xaf": number | null,"partner_id": string,"product_type": string,"status": string,"user_id": string,"valid_until": string,"vehicle_value_xaf": number | null
                  }
                  Insert: {
                    "annual_premium_xaf": number,"coverage_summary"?: string | null,"created_at"?: string,"hire_booking_id"?: string | null,"hire_listing_id"?: string | null,"id"?: string,"listing_id"?: string | null,"monthly_premium_xaf"?: number | null,"partner_id": string,"product_type": string,"status"?: string,"user_id": string,"valid_until": string,"vehicle_value_xaf"?: number | null
                  }
                  Update: {
                    "annual_premium_xaf"?: number,"coverage_summary"?: string | null,"created_at"?: string,"hire_booking_id"?: string | null,"hire_listing_id"?: string | null,"id"?: string,"listing_id"?: string | null,"monthly_premium_xaf"?: number | null,"partner_id"?: string,"product_type"?: string,"status"?: string,"user_id"?: string,"valid_until"?: string,"vehicle_value_xaf"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "insurance_quotes_hire_booking_id_fkey"
      columns: ["hire_booking_id"]
isOneToOne: false
      referencedRelation: "hire_bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "insurance_quotes_hire_listing_id_fkey"
      columns: ["hire_listing_id"]
isOneToOne: false
      referencedRelation: "hire_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "insurance_quotes_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "insurance_quotes_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "insurance_partners"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "insurance_quotes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"launch_lead_activities": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": string,"lead_id": string,"meta": NonNullable<Json>,"summary": string | null
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"lead_id": string,"meta"?: NonNullable<Json>,"summary"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: string,"lead_id"?: string,"meta"?: NonNullable<Json>,"summary"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "launch_lead_activities_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "launch_lead_activities_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "launch_leads"
      referencedColumns: ["id"]
    }
                  ]
                },"launch_leads": {
                  Row: {
                    "assigned_to": string | null,"business_name": string | null,"campaign_name": string | null,"city": string | null,"converted_entity_id": string | null,"converted_entity_type": string | null,"created_at": string,"email": string | null,"email_key": string | null,"hire_listing_id": string | null,"id": string,"intake_checklist": NonNullable<Json>,"interest": string | null,"lead_type": string,"listing_id": string | null,"name": string,"next_follow_up_at": string | null,"notes": string | null,"phone": string | null,"phone_key": string | null,"priority": string,"source": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "assigned_to"?: string | null,"business_name"?: string | null,"campaign_name"?: string | null,"city"?: string | null,"converted_entity_id"?: string | null,"converted_entity_type"?: string | null,"created_at"?: string,"email"?: string | null,"email_key"?: string | null,"hire_listing_id"?: string | null,"id"?: string,"intake_checklist"?: NonNullable<Json>,"interest"?: string | null,"lead_type": string,"listing_id"?: string | null,"name": string,"next_follow_up_at"?: string | null,"notes"?: string | null,"phone"?: string | null,"phone_key"?: string | null,"priority"?: string,"source"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_to"?: string | null,"business_name"?: string | null,"campaign_name"?: string | null,"city"?: string | null,"converted_entity_id"?: string | null,"converted_entity_type"?: string | null,"created_at"?: string,"email"?: string | null,"email_key"?: string | null,"hire_listing_id"?: string | null,"id"?: string,"intake_checklist"?: NonNullable<Json>,"interest"?: string | null,"lead_type"?: string,"listing_id"?: string | null,"name"?: string,"next_follow_up_at"?: string | null,"notes"?: string | null,"phone"?: string | null,"phone_key"?: string | null,"priority"?: string,"source"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "launch_leads_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "launch_leads_hire_listing_id_fkey"
      columns: ["hire_listing_id"]
isOneToOne: false
      referencedRelation: "hire_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "launch_leads_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"launch_readiness_checks": {
                  Row: {
                    "created_at": string,"detail": string,"key": string,"label": string,"notes": string | null,"status": string,"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "created_at"?: string,"detail": string,"key": string,"label": string,"notes"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"detail"?: string,"key"?: string,"label"?: string,"notes"?: string | null,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "launch_readiness_checks_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"launch_weekly_metrics": {
                  Row: {
                    "captured_at": string,"metric_key": string,"value": number,"week_start": string
                  }
                  Insert: {
                    "captured_at"?: string,"metric_key": string,"value"?: number,"week_start": string
                  }
                  Update: {
                    "captured_at"?: string,"metric_key"?: string,"value"?: number,"week_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"listing_views": {
                  Row: {
                    "date_day": string,"id": string,"listing_id": string,"viewed_at": string,"viewer_id": string | null
                  }
                  Insert: {
                    "date_day"?: string,"id"?: string,"listing_id": string,"viewed_at"?: string,"viewer_id"?: string | null
                  }
                  Update: {
                    "date_day"?: string,"id"?: string,"listing_id"?: string,"viewed_at"?: string,"viewer_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_views_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_views_viewer_id_fkey"
      columns: ["viewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "asking_price": number,"city": string | null,"created_at": string,"dealer_id": string | null,"description": string | null,"field_agent_id": string | null,"financeable": boolean,"id": string,"inspector_id": string | null,"mve_high": number | null,"mve_low": number | null,"previous_price": number | null,"price_band": string | null,"published_at": string | null,"seller_id": string,"sold_at": string | null,"status": string,"suggested_price": number | null,"updated_at": string,"vehicle_id": string,"vehicle_mileage_km": number | null,"verifier_id": string | null,"zone": string
                  }
                  Insert: {
                    "asking_price": number,"city"?: string | null,"created_at"?: string,"dealer_id"?: string | null,"description"?: string | null,"field_agent_id"?: string | null,"financeable"?: boolean,"id"?: string,"inspector_id"?: string | null,"mve_high"?: number | null,"mve_low"?: number | null,"previous_price"?: number | null,"price_band"?: string | null,"published_at"?: string | null,"seller_id": string,"sold_at"?: string | null,"status"?: string,"suggested_price"?: number | null,"updated_at"?: string,"vehicle_id": string,"vehicle_mileage_km"?: number | null,"verifier_id"?: string | null,"zone": string
                  }
                  Update: {
                    "asking_price"?: number,"city"?: string | null,"created_at"?: string,"dealer_id"?: string | null,"description"?: string | null,"field_agent_id"?: string | null,"financeable"?: boolean,"id"?: string,"inspector_id"?: string | null,"mve_high"?: number | null,"mve_low"?: number | null,"previous_price"?: number | null,"price_band"?: string | null,"published_at"?: string | null,"seller_id"?: string,"sold_at"?: string | null,"status"?: string,"suggested_price"?: number | null,"updated_at"?: string,"vehicle_id"?: string,"vehicle_mileage_km"?: number | null,"verifier_id"?: string | null,"zone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_dealer_id_fkey"
      columns: ["dealer_id"]
isOneToOne: false
      referencedRelation: "dealers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_field_agent_id_fkey"
      columns: ["field_agent_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_inspector_id_fkey"
      columns: ["inspector_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_verifier_id_fkey"
      columns: ["verifier_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"media_assets": {
                  Row: {
                    "asset_type": string,"bucket": string,"caption": string | null,"created_at": string,"display_order": number,"id": string,"listing_id": string,"storage_path": string,"uploaded_by": string
                  }
                  Insert: {
                    "asset_type"?: string,"bucket"?: string,"caption"?: string | null,"created_at"?: string,"display_order"?: number,"id"?: string,"listing_id": string,"storage_path": string,"uploaded_by": string
                  }
                  Update: {
                    "asset_type"?: string,"bucket"?: string,"caption"?: string | null,"created_at"?: string,"display_order"?: number,"id"?: string,"listing_id"?: string,"storage_path"?: string,"uploaded_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "media_assets_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "media_assets_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": string,"read_at": string | null,"sender_id": string
                  }
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id"?: string,"read_at"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"read_at"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"mfi_application_offers": {
                  Row: {
                    "application_id": string,"buyer_responded_at": string | null,"buyer_response": string | null,"created_at": string,"id": string,"mfi_institution_id": string,"notes": string | null,"proposed_down_payment_percent": number | null,"proposed_interest_rate_percent": number | null,"proposed_tenor_months": number | null,"responder_id": string | null,"status": string,"updated_at": string
                  }
                  Insert: {
                    "application_id": string,"buyer_responded_at"?: string | null,"buyer_response"?: string | null,"created_at"?: string,"id"?: string,"mfi_institution_id": string,"notes"?: string | null,"proposed_down_payment_percent"?: number | null,"proposed_interest_rate_percent"?: number | null,"proposed_tenor_months"?: number | null,"responder_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "application_id"?: string,"buyer_responded_at"?: string | null,"buyer_response"?: string | null,"created_at"?: string,"id"?: string,"mfi_institution_id"?: string,"notes"?: string | null,"proposed_down_payment_percent"?: number | null,"proposed_interest_rate_percent"?: number | null,"proposed_tenor_months"?: number | null,"responder_id"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mfi_application_offers_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "financing_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mfi_application_offers_mfi_institution_id_fkey"
      columns: ["mfi_institution_id"]
isOneToOne: false
      referencedRelation: "mfi_institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mfi_application_offers_responder_id_fkey"
      columns: ["responder_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"mfi_institutions": {
                  Row: {
                    "active": boolean,"city": string | null,"code": string,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"id": string,"name": string
                  }
                  Insert: {
                    "active"?: boolean,"city"?: string | null,"code": string,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "active"?: boolean,"city"?: string | null,"code"?: string,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"application_id": string | null,"buyer_id": string | null,"completed_at": string | null,"created_at": string,"currency": string,"external_ref": string | null,"id": string,"initiated_at": string,"inspection_request_id": string | null,"meta": NonNullable<Json>,"payment_type": string,"phone": string,"provider": string,"status": string
                  }
                  Insert: {
                    "amount": number,"application_id"?: string | null,"buyer_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"external_ref"?: string | null,"id"?: string,"initiated_at"?: string,"inspection_request_id"?: string | null,"meta"?: NonNullable<Json>,"payment_type"?: string,"phone": string,"provider": string,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"application_id"?: string | null,"buyer_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"currency"?: string,"external_ref"?: string | null,"id"?: string,"initiated_at"?: string,"inspection_request_id"?: string | null,"meta"?: NonNullable<Json>,"payment_type"?: string,"phone"?: string,"provider"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "financing_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_buyer_id_fkey"
      columns: ["buyer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_inspection_request_id_fkey"
      columns: ["inspection_request_id"]
isOneToOne: false
      referencedRelation: "inspection_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"price_alerts": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"last_notified_at": string | null,"listing_id": string,"threshold_price": number,"user_id": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"last_notified_at"?: string | null,"listing_id": string,"threshold_price": number,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"last_notified_at"?: string | null,"listing_id"?: string,"threshold_price"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_alerts_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "price_alerts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "auth_id": string | null,"avg_rating": number | null,"city": string | null,"created_at": string,"email": string,"full_name": string | null,"id": string,"is_verified": boolean,"last_login_at": string | null,"mfi_institution_id": string | null,"phone": string | null,"role": string,"status": string,"total_reviews": number,"updated_at": string,"zone": string | null
                  }
                  Insert: {
                    "auth_id"?: string | null,"avg_rating"?: number | null,"city"?: string | null,"created_at"?: string,"email": string,"full_name"?: string | null,"id"?: string,"is_verified"?: boolean,"last_login_at"?: string | null,"mfi_institution_id"?: string | null,"phone"?: string | null,"role": string,"status"?: string,"total_reviews"?: number,"updated_at"?: string,"zone"?: string | null
                  }
                  Update: {
                    "auth_id"?: string | null,"avg_rating"?: number | null,"city"?: string | null,"created_at"?: string,"email"?: string,"full_name"?: string | null,"id"?: string,"is_verified"?: boolean,"last_login_at"?: string | null,"mfi_institution_id"?: string | null,"phone"?: string | null,"role"?: string,"status"?: string,"total_reviews"?: number,"updated_at"?: string,"zone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_mfi_institution_id_fkey"
      columns: ["mfi_institution_id"]
isOneToOne: false
      referencedRelation: "mfi_institutions"
      referencedColumns: ["id"]
    }
                  ]
                },"referral_codes": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"reward_balance_xaf": number,"total_uses": number,"user_id": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"reward_balance_xaf"?: number,"total_uses"?: number,"user_id": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"reward_balance_xaf"?: number,"total_uses"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "referral_codes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"referral_uses": {
                  Row: {
                    "code_id": string,"created_at": string,"id": string,"referred_user_id": string,"reward_xaf": number,"rewarded": boolean
                  }
                  Insert: {
                    "code_id": string,"created_at"?: string,"id"?: string,"referred_user_id": string,"reward_xaf"?: number,"rewarded"?: boolean
                  }
                  Update: {
                    "code_id"?: string,"created_at"?: string,"id"?: string,"referred_user_id"?: string,"reward_xaf"?: number,"rewarded"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "referral_uses_code_id_fkey"
      columns: ["code_id"]
isOneToOne: false
      referencedRelation: "referral_codes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referral_uses_referred_user_id_fkey"
      columns: ["referred_user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"review_responses": {
                  Row: {
                    "comment": string,"created_at": string,"id": string,"responder_id": string,"review_id": string
                  }
                  Insert: {
                    "comment": string,"created_at"?: string,"id"?: string,"responder_id": string,"review_id": string
                  }
                  Update: {
                    "comment"?: string,"created_at"?: string,"id"?: string,"responder_id"?: string,"review_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_responses_responder_id_fkey"
      columns: ["responder_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_responses_review_id_fkey"
      columns: ["review_id"]
isOneToOne: true
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "comment": string | null,"created_at": string,"entity_id": string,"entity_type": string,"id": string,"rating": number,"reviewed_id": string,"reviewer_id": string,"status": string,"title": string | null,"updated_at": string
                  }
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"entity_id": string,"entity_type": string,"id"?: string,"rating": number,"reviewed_id": string,"reviewer_id": string,"status"?: string,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: string,"rating"?: number,"reviewed_id"?: string,"reviewer_id"?: string,"status"?: string,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_reviewed_id_fkey"
      columns: ["reviewed_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_searches": {
                  Row: {
                    "active": boolean,"created_at": string,"filters": NonNullable<Json>,"id": string,"label": string,"last_match_count": number,"last_notified_at": string | null,"notify_via": string,"search_type": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"filters"?: NonNullable<Json>,"id"?: string,"label": string,"last_match_count"?: number,"last_notified_at"?: string | null,"notify_via"?: string,"search_type": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"filters"?: NonNullable<Json>,"id"?: string,"label"?: string,"last_match_count"?: number,"last_notified_at"?: string | null,"notify_via"?: string,"search_type"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_searches_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicles": {
                  Row: {
                    "color": string | null,"condition_grade": string | null,"created_at": string,"engine_cc": number | null,"fuel_type": string,"id": string,"inspection_notes": string | null,"make": string,"mileage_km": number,"model": string,"seats": number | null,"transmission": string,"vin": string | null,"year": number
                  }
                  Insert: {
                    "color"?: string | null,"condition_grade"?: string | null,"created_at"?: string,"engine_cc"?: number | null,"fuel_type"?: string,"id"?: string,"inspection_notes"?: string | null,"make": string,"mileage_km"?: number,"model": string,"seats"?: number | null,"transmission"?: string,"vin"?: string | null,"year": number
                  }
                  Update: {
                    "color"?: string | null,"condition_grade"?: string | null,"created_at"?: string,"engine_cc"?: number | null,"fuel_type"?: string,"id"?: string,"inspection_notes"?: string | null,"make"?: string,"mileage_km"?: number,"model"?: string,"seats"?: number | null,"transmission"?: string,"vin"?: string | null,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"zone_rules": {
                  Row: {
                    "condition_grade": string,"created_at": string,"down_payment_percent": number,"financeable": boolean,"id": string,"income_grade": string,"manual_review_required": boolean,"max_tenor_months": number,"updated_at": string,"vehicle_price_band": string,"zone": string
                  }
                  Insert: {
                    "condition_grade": string,"created_at"?: string,"down_payment_percent"?: number,"financeable"?: boolean,"id"?: string,"income_grade": string,"manual_review_required"?: boolean,"max_tenor_months"?: number,"updated_at"?: string,"vehicle_price_band": string,"zone": string
                  }
                  Update: {
                    "condition_grade"?: string,"created_at"?: string,"down_payment_percent"?: number,"financeable"?: boolean,"id"?: string,"income_grade"?: string,"manual_review_required"?: boolean,"max_tenor_months"?: number,"updated_at"?: string,"vehicle_price_band"?: string,"zone"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_profile_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"finance_commission_totals":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"financing_pipeline_totals":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"hire_booking_totals":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"hire_service_fee_totals":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"launch_lead_activity_outcomes":
{ Args: { "p_since": string }; Returns: Json
                           },
"launch_lead_metrics":
{ Args: { "p_open_statuses": (string)[],"p_since": string }; Returns: Json
                           },
"launch_lead_workload":
{ Args: { "p_open_statuses": (string)[] }; Returns: Json
                           },
"mfi_partner_stats":
{ Args: { "p_inactive_statuses": (string)[] }; Returns: Json
                           },
"recompute_profile_rating":
{ Args: { "p_profile_id": string }; Returns: undefined
                           },
"show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
                           },
"unread_message_counts":
{ Args: { "p_user_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
