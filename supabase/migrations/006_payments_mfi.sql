-- ============================================================
-- Migration 006 — Payments, MFI portal, mfi_partner role
-- Run in Supabase SQL editor
-- ============================================================

-- 1. Add mfi_partner to the role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
  role IN ('buyer','seller_individual','seller_dealer','field_agent','inspector','verifier','admin','mfi_partner')
);

-- 2. MFI institutions
CREATE TABLE IF NOT EXISTS mfi_institutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          TEXT UNIQUE NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  city          TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE mfi_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON mfi_institutions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Link MFI partner profile to institution
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mfi_institution_id UUID REFERENCES mfi_institutions(id);

-- 4. Link applications to MFI + add disbursed_at
ALTER TABLE financing_applications
  ADD COLUMN IF NOT EXISTS mfi_institution_id UUID REFERENCES mfi_institutions(id);
ALTER TABLE financing_applications
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;

-- 5. Payments table
CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id   UUID REFERENCES financing_applications(id) ON DELETE CASCADE,
  buyer_id         UUID REFERENCES profiles(id),
  amount           INTEGER NOT NULL,                   -- XAF, no decimals
  currency         TEXT NOT NULL DEFAULT 'XAF',
  payment_type     TEXT NOT NULL DEFAULT 'down_payment'
    CHECK (payment_type IN ('down_payment', 'monthly', 'fee')),
  provider         TEXT NOT NULL
    CHECK (provider IN ('mtn_momo', 'orange_money', 'cash', 'bank_transfer')),
  phone            TEXT NOT NULL,
  external_ref     TEXT,                               -- provider reference
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'successful', 'failed', 'cancelled')),
  initiated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  meta             JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_app   ON payments (application_id);
CREATE INDEX IF NOT EXISTS idx_payments_buyer ON payments (buyer_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed one example MFI (remove or adjust for production)
INSERT INTO mfi_institutions (name, code, contact_email, city)
VALUES ('MFI Partenaire Exemple', 'MFI001', 'contact@mfi.cm', 'Douala')
ON CONFLICT (code) DO NOTHING;
