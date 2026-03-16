-- Migration 011: Reviews & Ratings System
-- Trust infrastructure for MotoPayee

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewed_id UUID NOT NULL REFERENCES profiles(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('listing', 'hire_listing', 'hire_booking')),
  entity_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, entity_type, entity_id)
);

CREATE INDEX idx_reviews_reviewed_id ON reviews(reviewed_id);
CREATE INDEX idx_reviews_entity ON reviews(entity_type, entity_id);
CREATE INDEX idx_reviews_status ON reviews(status);

-- Review responses (seller/owner replies)
CREATE TABLE IF NOT EXISTS review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES profiles(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id)
);

-- Add rating columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1) DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER NOT NULL DEFAULT 0;

-- Function to recompute profile rating
CREATE OR REPLACE FUNCTION recompute_profile_rating(p_profile_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM reviews
      WHERE reviewed_id = p_profile_id AND status = 'published'
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE reviewed_id = p_profile_id AND status = 'published'
    ),
    updated_at = now()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_service ON reviews FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY review_responses_service ON review_responses FOR ALL USING (auth.role() = 'service_role');

-- Public can read published reviews
CREATE POLICY reviews_public_read ON reviews FOR SELECT USING (status = 'published');
CREATE POLICY review_responses_public_read ON review_responses FOR SELECT USING (true);
