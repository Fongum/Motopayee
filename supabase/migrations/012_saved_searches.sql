-- Migration 012: Saved Searches & Price Alerts
-- Drives repeat engagement + conversions

-- Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  search_type TEXT NOT NULL CHECK (search_type IN ('listing', 'hire')),
  label TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  notify_via TEXT NOT NULL DEFAULT 'none' CHECK (notify_via IN ('sms', 'whatsapp', 'none')),
  active BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  last_match_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_active ON saved_searches(active) WHERE active = true;

-- Price Alerts
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  listing_id UUID NOT NULL REFERENCES listings(id),
  threshold_price INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX idx_price_alerts_active ON price_alerts(active) WHERE active = true;

-- Track previous price on listings for price drop detection
ALTER TABLE listings ADD COLUMN IF NOT EXISTS previous_price INTEGER;

-- RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_searches_service ON saved_searches FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY price_alerts_service ON price_alerts FOR ALL USING (auth.role() = 'service_role');
