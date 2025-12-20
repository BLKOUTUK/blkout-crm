-- Migration: Referral System
-- Purpose: Enable member-to-member referrals with tracking
-- Supports: Share links, referral counting, newsletter sharing

-- ============================================================================
-- ADD REFERRAL COLUMNS TO CONTACTS
-- ============================================================================

-- Unique referral code for each contact (auto-generated)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Who referred this contact (self-referential)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

-- Running count of successful referrals
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_contacts_referral_code ON contacts(referral_code);
CREATE INDEX IF NOT EXISTS idx_contacts_referred_by ON contacts(referred_by_id);

-- ============================================================================
-- REFERRALS TABLE (detailed tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'invalid'
  channel TEXT, -- 'share_link', 'newsletter', 'social', 'direct'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate referrals
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment referral count (called from API)
CREATE OR REPLACE FUNCTION increment_referral_count(contact_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE contacts
  SET referral_count = COALESCE(referral_count, 0) + 1
  WHERE id = contact_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get referral stats for a contact
CREATE OR REPLACE FUNCTION get_referral_stats(contact_uuid UUID)
RETURNS TABLE (
  total_referrals INTEGER,
  newsletter_signups INTEGER,
  blkouthub_signups INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_referrals,
    COUNT(CASE WHEN c.subscriptions->>'newsletter' = 'true' THEN 1 END)::INTEGER as newsletter_signups,
    COUNT(CASE WHEN c.subscriptions->>'blkouthub' = 'true' THEN 1 END)::INTEGER as blkouthub_signups
  FROM referrals r
  JOIN contacts c ON c.id = r.referred_id
  WHERE r.referrer_id = contact_uuid
  AND r.status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique referral codes for existing contacts without one
CREATE OR REPLACE FUNCTION generate_missing_referral_codes()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  contact_record RECORD;
  new_code TEXT;
BEGIN
  FOR contact_record IN
    SELECT id FROM contacts WHERE referral_code IS NULL
  LOOP
    -- Generate 8-character hex code
    new_code := upper(encode(gen_random_bytes(4), 'hex'));

    -- Ensure uniqueness (regenerate if collision)
    WHILE EXISTS (SELECT 1 FROM contacts WHERE referral_code = new_code) LOOP
      new_code := upper(encode(gen_random_bytes(4), 'hex'));
    END LOOP;

    UPDATE contacts SET referral_code = new_code WHERE id = contact_record.id;
    updated_count := updated_count + 1;
  END LOOP;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Generate codes for any existing contacts
SELECT generate_missing_referral_codes();

-- ============================================================================
-- SHARE LINK TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS share_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  source TEXT, -- 'newsletter', 'social', 'direct', 'qr'
  ip_address TEXT,
  user_agent TEXT,
  converted BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_clicks_code ON share_link_clicks(referral_code);
CREATE INDEX IF NOT EXISTS idx_share_clicks_source ON share_link_clicks(source);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_link_clicks ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to referrals" ON referrals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to share_link_clicks" ON share_link_clicks
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE referrals IS 'Tracks member-to-member referral relationships';
COMMENT ON TABLE share_link_clicks IS 'Analytics for share link usage';
COMMENT ON COLUMN contacts.referral_code IS 'Unique 8-character code for sharing';
COMMENT ON COLUMN contacts.referral_count IS 'Running total of successful referrals';
