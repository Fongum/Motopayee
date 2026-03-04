-- ============================================================
-- Migration 005 — Social features: favourites, views, verified seller
-- Run in Supabase SQL editor
-- ============================================================

-- 1. Verified flag on profiles (seller badge)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Favourites: buyers save listings
CREATE TABLE IF NOT EXISTS favourites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES listings(id)  ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_favourites_user    ON favourites (user_id);
CREATE INDEX IF NOT EXISTS idx_favourites_listing ON favourites (listing_id);
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON favourites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Listing views (anonymous + authenticated, one row per page load)
CREATE TABLE IF NOT EXISTS listing_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  viewer_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date_day    DATE        NOT NULL DEFAULT CURRENT_DATE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lv_listing ON listing_views (listing_id);
CREATE INDEX IF NOT EXISTS idx_lv_day     ON listing_views (listing_id, date_day);
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON listing_views
  FOR ALL TO service_role USING (true) WITH CHECK (true);
