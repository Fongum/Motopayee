-- Migration 013: In-App Messaging, Referral Program, Insurance Marketplace, Browsing History
-- Phases 6, 7, 9, 10 of Dominance Plan

-- ═══════════ PHASE 6: IN-APP MESSAGING ═══════════

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  hire_listing_id UUID REFERENCES hire_listings(id),
  participant_a UUID NOT NULL REFERENCES profiles(id),
  participant_b UUID NOT NULL REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, participant_a, participant_b),
  UNIQUE (hire_listing_id, participant_a, participant_b)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_participant_a ON conversations(participant_a);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_unread ON messages(conversation_id) WHERE read_at IS NULL;

-- ═══════════ PHASE 7: REFERRAL PROGRAM ═══════════

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  code TEXT NOT NULL UNIQUE,
  total_uses INTEGER NOT NULL DEFAULT 0,
  reward_balance_xaf INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID NOT NULL REFERENCES referral_codes(id),
  referred_user_id UUID NOT NULL REFERENCES profiles(id),
  reward_xaf INTEGER NOT NULL DEFAULT 0,
  rewarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- ═══════════ PHASE 9: INSURANCE MARKETPLACE ═══════════

CREATE TABLE IF NOT EXISTS insurance_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  products JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES insurance_partners(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  hire_listing_id UUID REFERENCES hire_listings(id),
  hire_booking_id UUID REFERENCES hire_bookings(id),
  product_type TEXT NOT NULL CHECK (product_type IN ('comprehensive', 'third_party', 'hire_coverage')),
  vehicle_value_xaf INTEGER,
  annual_premium_xaf INTEGER NOT NULL,
  monthly_premium_xaf INTEGER,
  coverage_summary TEXT,
  status TEXT NOT NULL DEFAULT 'quoted' CHECK (status IN ('quoted', 'accepted', 'expired', 'cancelled')),
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════ PHASE 10: BROWSING HISTORY / RECOMMENDATIONS ═══════════

CREATE TABLE IF NOT EXISTS browsing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('listing', 'hire_listing')),
  entity_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_browsing_history_user ON browsing_history(user_id, viewed_at DESC);
-- Prevent duplicate rapid views (one row per user/entity/day).
--
-- `viewed_at::date` cannot be used here: casting a timestamptz to date depends
-- on the session TimeZone, so Postgres treats it as STABLE and rejects it in an
-- index expression (42P17). Pinning the zone makes the expression IMMUTABLE.
-- Africa/Douala (WAT, UTC+1, no DST) also gives the day boundary users expect.
CREATE UNIQUE INDEX idx_browsing_unique_daily
  ON browsing_history(user_id, entity_type, entity_id, ((viewed_at AT TIME ZONE 'Africa/Douala')::date));

-- ═══════════ RLS ═══════════

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE browsing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_service ON conversations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY messages_service ON messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY referral_codes_service ON referral_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY referral_uses_service ON referral_uses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY insurance_partners_service ON insurance_partners FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY insurance_partners_public_read ON insurance_partners FOR SELECT USING (active = true);
CREATE POLICY insurance_quotes_service ON insurance_quotes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY browsing_history_service ON browsing_history FOR ALL USING (auth.role() = 'service_role');

-- Seed insurance partners (Cameroon's big 3)
INSERT INTO insurance_partners (name, code, products) VALUES
  ('ACTIVA Assurances', 'activa', '[{"type":"comprehensive","label":"Tous risques"},{"type":"third_party","label":"Responsabilité civile"},{"type":"hire_coverage","label":"Couverture location"}]'),
  ('SAAR Assurances', 'saar', '[{"type":"comprehensive","label":"Tous risques"},{"type":"third_party","label":"Responsabilité civile"}]'),
  ('Chanas Assurances', 'chanas', '[{"type":"comprehensive","label":"Tous risques"},{"type":"third_party","label":"Responsabilité civile"},{"type":"hire_coverage","label":"Couverture location"}]')
ON CONFLICT (code) DO NOTHING;
