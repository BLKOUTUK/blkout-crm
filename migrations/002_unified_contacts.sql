-- Migration: Unified Contacts Table
-- Purpose: Single source of truth for all community signups
-- GDPR compliant with full consent tracking and data rights

-- ============================================================================
-- UNIFIED CONTACTS TABLE
-- ============================================================================

-- Add new columns to existing contacts table for unified signup
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pronouns TEXT;

-- Consent & transparency (GDPR compliant)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_method TEXT; -- 'signup_widget_v1', 'import', 'event_rsvp', 'blkouthub'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS consent_text_hash TEXT; -- SHA256 of consent text shown
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS privacy_policy_version TEXT DEFAULT '1.0';

-- Subscription preferences (granular control)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS subscriptions JSONB DEFAULT '{
  "newsletter": false,
  "events": false,
  "blkouthub": false,
  "volunteer": false
}'::jsonb;

-- External platform sync IDs
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS sendfox_contact_id TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS heartbeat_user_id TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS heartbeat_invite_sent_at TIMESTAMPTZ;

-- Source tracking for quality data
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS signup_source TEXT; -- 'widget', 'event_rsvp', 'import', 'blkouthub_invite'
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS signup_source_url TEXT; -- Which page they signed up from
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS signup_referrer TEXT; -- Who referred them

-- Email verification
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMPTZ;

-- Data rights (GDPR Article 15-17)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS data_export_requested_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS data_export_completed_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ;

-- Unsubscribe tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS unsubscribe_feedback TEXT;

-- ============================================================================
-- CONSENT AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'consent_given', 'consent_withdrawn', 'subscription_changed', 'data_exported', 'deletion_requested'
  details JSONB, -- What changed
  consent_text TEXT, -- Full text user agreed to (for legal proof)
  ip_address TEXT, -- For audit purposes
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_contact ON consent_audit_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_action ON consent_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_consent_audit_created ON consent_audit_log(created_at);

-- ============================================================================
-- BLKOUTHUB INVITATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS blkouthub_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invitation_code TEXT DEFAULT 'BE862C', -- BLKOUT community code
  invitation_url TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  heartbeat_user_id TEXT, -- Populated when they join
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'accepted', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blkouthub_invitations_email ON blkouthub_invitations(email);
CREATE INDEX IF NOT EXISTS idx_blkouthub_invitations_status ON blkouthub_invitations(status);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log consent changes
CREATE OR REPLACE FUNCTION log_consent_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Log subscription changes
    IF OLD.subscriptions IS DISTINCT FROM NEW.subscriptions THEN
      INSERT INTO consent_audit_log (contact_id, action, details)
      VALUES (NEW.id, 'subscription_changed', jsonb_build_object(
        'old', OLD.subscriptions,
        'new', NEW.subscriptions
      ));
    END IF;

    -- Log consent changes
    IF OLD.consent_given IS DISTINCT FROM NEW.consent_given THEN
      INSERT INTO consent_audit_log (contact_id, action, details)
      VALUES (NEW.id,
        CASE WHEN NEW.consent_given THEN 'consent_given' ELSE 'consent_withdrawn' END,
        jsonb_build_object('timestamp', NOW())
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for consent audit logging
DROP TRIGGER IF EXISTS trigger_consent_audit ON contacts;
CREATE TRIGGER trigger_consent_audit
  AFTER UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION log_consent_change();

-- Function to get subscription count by type
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS TABLE (
  subscription_type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'newsletter'::TEXT, COUNT(*) FROM contacts WHERE (subscriptions->>'newsletter')::boolean = true
  UNION ALL
  SELECT 'events'::TEXT, COUNT(*) FROM contacts WHERE (subscriptions->>'events')::boolean = true
  UNION ALL
  SELECT 'blkouthub'::TEXT, COUNT(*) FROM contacts WHERE (subscriptions->>'blkouthub')::boolean = true
  UNION ALL
  SELECT 'volunteer'::TEXT, COUNT(*) FROM contacts WHERE (subscriptions->>'volunteer')::boolean = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE consent_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE blkouthub_invitations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access to consent_audit_log" ON consent_audit_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to blkouthub_invitations" ON blkouthub_invitations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE consent_audit_log IS 'GDPR-compliant audit trail of all consent and subscription changes';
COMMENT ON TABLE blkouthub_invitations IS 'Track BLKOUTHUB (Heartbeat.chat) community invitations';

COMMENT ON COLUMN contacts.consent_given IS 'User explicitly agreed to data collection';
COMMENT ON COLUMN contacts.consent_text_hash IS 'SHA256 hash of exact consent text shown - for legal proof';
COMMENT ON COLUMN contacts.subscriptions IS 'Granular subscription preferences as JSONB';
COMMENT ON COLUMN contacts.signup_source IS 'Where the user signed up from for attribution';
