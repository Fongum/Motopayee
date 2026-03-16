-- ============================================================
-- Migration 010 — Vehicle Hire Feature
-- Tables: hire_listings, hire_listing_media, hire_bookings
-- ============================================================

-- --------------- Hire Listing ---------------
CREATE TABLE IF NOT EXISTS hire_listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES profiles(id),
  dealer_id     UUID REFERENCES dealers(id),

  -- Vehicle info
  make          TEXT NOT NULL,
  model         TEXT NOT NULL,
  year          INT NOT NULL,
  fuel_type     TEXT NOT NULL DEFAULT 'petrol'
                CHECK (fuel_type IN ('petrol','diesel','electric','hybrid','other')),
  transmission  TEXT NOT NULL DEFAULT 'automatic'
                CHECK (transmission IN ('manual','automatic','other')),
  color         TEXT,
  seats         INT DEFAULT 5,
  engine_cc     INT,
  plate_number  TEXT,

  -- Hire type
  hire_type     TEXT NOT NULL DEFAULT 'self_drive'
                CHECK (hire_type IN ('self_drive','with_driver','both')),

  -- Pricing (XAF)
  daily_rate    BIGINT NOT NULL,
  weekly_rate   BIGINT,
  monthly_rate  BIGINT,
  deposit_amount BIGINT NOT NULL DEFAULT 0,

  -- Driver option
  driver_daily_rate BIGINT,

  -- Mileage policy
  mileage_limit_per_day_km INT,
  extra_km_charge          BIGINT,

  -- Duration constraints
  min_hire_days INT NOT NULL DEFAULT 1,
  max_hire_days INT,

  -- Location
  city          TEXT NOT NULL,
  zone          TEXT NOT NULL DEFAULT 'A' CHECK (zone IN ('A','B','C')),
  address       TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,

  -- Details
  description   TEXT,
  conditions    TEXT,
  features      JSONB DEFAULT '[]'::jsonb,
  insurance_included BOOLEAN NOT NULL DEFAULT false,

  -- Status
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','pending_review','published','suspended','withdrawn')),
  availability  TEXT NOT NULL DEFAULT 'available'
                CHECK (availability IN ('available','hired_out','maintenance','unavailable')),

  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hire_listings_owner    ON hire_listings(owner_id);
CREATE INDEX idx_hire_listings_status   ON hire_listings(status);
CREATE INDEX idx_hire_listings_city     ON hire_listings(city);
CREATE INDEX idx_hire_listings_avail    ON hire_listings(availability);

-- --------------- Hire Listing Media ---------------
CREATE TABLE IF NOT EXISTS hire_listing_media (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_listing_id UUID NOT NULL REFERENCES hire_listings(id) ON DELETE CASCADE,
  asset_type      TEXT NOT NULL DEFAULT 'photo' CHECK (asset_type IN ('photo','video')),
  storage_path    TEXT NOT NULL,
  bucket          TEXT NOT NULL DEFAULT 'listing-media',
  display_order   INT NOT NULL DEFAULT 0,
  caption         TEXT,
  uploaded_by     UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hire_media_listing ON hire_listing_media(hire_listing_id);

-- --------------- Hire Bookings ---------------
CREATE TABLE IF NOT EXISTS hire_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_listing_id UUID NOT NULL REFERENCES hire_listings(id),
  renter_id       UUID NOT NULL REFERENCES profiles(id),
  owner_id        UUID NOT NULL REFERENCES profiles(id),

  -- Dates
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  total_days      INT NOT NULL,

  -- Pricing snapshot
  hire_type       TEXT NOT NULL DEFAULT 'self_drive'
                  CHECK (hire_type IN ('self_drive','with_driver')),
  daily_rate      BIGINT NOT NULL,
  driver_daily_rate BIGINT,
  deposit_amount  BIGINT NOT NULL DEFAULT 0,
  total_amount    BIGINT NOT NULL,

  -- Locations
  pickup_location  TEXT,
  dropoff_location TEXT,

  -- Status
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','active','completed','cancelled','disputed')),

  -- Notes
  renter_notes    TEXT,
  owner_notes     TEXT,
  cancellation_reason TEXT,

  -- Payment
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid','deposit_paid','fully_paid','refunded')),
  payment_provider TEXT CHECK (payment_provider IN ('mtn_momo','orange_money','cash','bank_transfer')),
  payment_phone   TEXT,

  confirmed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_hire_bookings_listing ON hire_bookings(hire_listing_id);
CREATE INDEX idx_hire_bookings_renter  ON hire_bookings(renter_id);
CREATE INDEX idx_hire_bookings_owner   ON hire_bookings(owner_id);
CREATE INDEX idx_hire_bookings_status  ON hire_bookings(status);
CREATE INDEX idx_hire_bookings_dates   ON hire_bookings(start_date, end_date);

-- --------------- RLS ---------------
ALTER TABLE hire_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hire_listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE hire_bookings ENABLE ROW LEVEL SECURITY;

-- Service role bypasses all
CREATE POLICY hire_listings_service ON hire_listings FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY hire_media_service ON hire_listing_media FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY hire_bookings_service ON hire_bookings FOR ALL
  USING (auth.role() = 'service_role');

-- Public can read published hire listings
CREATE POLICY hire_listings_public_read ON hire_listings FOR SELECT
  USING (status = 'published');

-- Public can read media for published listings
CREATE POLICY hire_media_public_read ON hire_listing_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hire_listings
      WHERE hire_listings.id = hire_listing_media.hire_listing_id
        AND hire_listings.status = 'published'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_hire_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hire_listings_updated
  BEFORE UPDATE ON hire_listings
  FOR EACH ROW EXECUTE FUNCTION update_hire_updated_at();

CREATE TRIGGER trg_hire_bookings_updated
  BEFORE UPDATE ON hire_bookings
  FOR EACH ROW EXECUTE FUNCTION update_hire_updated_at();
