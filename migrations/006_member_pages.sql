-- ============================================
-- 006_member_pages.sql
-- Member Pages — Spec 01 (wish list item 10)
-- Spec: projects/membership/docs/member-pages-spec-01.md
-- Signed off by Rob, 27 July 2026
--
-- Adds: consent fields on contacts (they did not exist — consent was only
--       recorded on newsletter_subscriptions, i.e. for the mailing list
--       rather than for the person)
--       member_access_tokens — one-time magic-link tokens, hashes only
--       member_data_audit    — immutable record of every member view/edit/
--                              withdrawal, and the value that was there before
--
-- Additive only. No existing column is altered or dropped.
-- ============================================

-- --------------------------------------------
-- 1. Consent on the person, not just the mailing list
-- --------------------------------------------
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS consent_given_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_method    TEXT,
  ADD COLUMN IF NOT EXISTS consent_source    TEXT,
  ADD COLUMN IF NOT EXISTS data_withdrawn_at TIMESTAMPTZ;

COMMENT ON COLUMN contacts.consent_given_at  IS 'When this person consented to us holding their record.';
COMMENT ON COLUMN contacts.consent_method    IS 'signup_form | event | import | verbal | unknown';
COMMENT ON COLUMN contacts.consent_source    IS 'Free text: which form, which event, which import.';
COMMENT ON COLUMN contacts.data_withdrawn_at IS 'Set when a member withdraws one or more fields via members.blkoutuk.com. Presence means the record has been edited by its subject — see member_data_audit.';

-- --------------------------------------------
-- 2. Magic-link tokens
--    We store a SHA-256 hash, never the token itself. A leaked table
--    therefore does not grant access to anybody's record.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS member_access_tokens (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id   UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    used_at      TIMESTAMPTZ,
    requested_ip TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_tokens_hash    ON member_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_member_tokens_contact ON member_access_tokens(contact_id);
CREATE INDEX IF NOT EXISTS idx_member_tokens_expiry  ON member_access_tokens(expires_at);

COMMENT ON TABLE  member_access_tokens IS 'One-time links for members.blkoutuk.com. 30-minute expiry, single use.';
COMMENT ON COLUMN member_access_tokens.token_hash IS 'SHA-256 of the token. The plaintext token exists only in the email we sent and never touches the database or any log.';

-- --------------------------------------------
-- 3. Audit trail
--    Append-only by convention and by grant: the service role may INSERT
--    and SELECT, nothing may UPDATE or DELETE. This is where BLKOUT's prior
--    assessment of a person survives after that person overwrites it, per
--    the spec's "edit or delete any of it" decision.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS member_data_audit (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    actor      TEXT NOT NULL CHECK (actor IN ('member', 'staff', 'system')),
    action     TEXT NOT NULL CHECK (action IN ('view', 'edit', 'withdraw')),
    field_name TEXT,
    old_value  TEXT,
    new_value  TEXT,
    at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_audit_contact ON member_data_audit(contact_id);
CREATE INDEX IF NOT EXISTS idx_member_audit_at      ON member_data_audit(at DESC);
CREATE INDEX IF NOT EXISTS idx_member_audit_actor   ON member_data_audit(contact_id, actor, field_name);

COMMENT ON TABLE  member_data_audit IS 'Every member view, edit and withdrawal. Append-only. A row with actor=member on a field means the live value was set by its subject, not by BLKOUT — the CRM should mark it as such rather than present it as our own judgement.';
COMMENT ON COLUMN member_data_audit.old_value IS 'The value before the change. For member edits of BLKOUT assessments (engagement_level, notes) this is where our prior view is preserved.';

-- --------------------------------------------
-- 4. Lock both tables down
--    RLS enabled with NO permissive policies: anon and authenticated get
--    nothing. service_role bypasses RLS, which is how the edge functions
--    reach these tables. Explicit REVOKE as well as RLS — belt and braces,
--    because RLS without revoked grants has bitten this estate before.
-- --------------------------------------------
ALTER TABLE member_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_data_audit    ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON member_access_tokens FROM anon, authenticated;
REVOKE ALL ON member_data_audit    FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON member_access_tokens TO service_role;
GRANT SELECT, INSERT                 ON member_data_audit    TO service_role;

-- NOTE (27 Jul 2026): the GRANT above does NOT make member_data_audit
-- append-only. Supabase default privileges had already granted ALL on
-- public-schema tables to service_role, and a GRANT is additive. Verified
-- after applying: service_role still held UPDATE, DELETE, TRUNCATE.
-- See 007_member_audit_append_only.sql, which revokes them and adds a
-- trigger. Do not rely on this file alone for that guarantee.
