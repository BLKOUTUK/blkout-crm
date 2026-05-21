-- ============================================
-- Critical Frequency fundraising integration
-- Adds:
--   1. organizations.cf_audience_profile column (A-H)
--   2. cf_fundraising_drafts table (one row per generated output)
--
-- The drafts table is populated by the comms-blkout fundraising CLI
-- (`fundraising sync`). The file_path column is canonical — drafts live as
-- markdown files in the repo at apps/comms-blkout/src/fundraising/outputs/.
-- ============================================

-- 1. Add audience profile column to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS cf_audience_profile TEXT
CHECK (cf_audience_profile IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'));

COMMENT ON COLUMN organizations.cf_audience_profile IS
  'Critical Frequency fundraising audience profile (A-H). See apps/comms-blkout/src/fundraising/lib/profiles.py for the canonical definitions.';

CREATE INDEX IF NOT EXISTS idx_orgs_cf_audience_profile
  ON organizations(cf_audience_profile)
  WHERE cf_audience_profile IS NOT NULL;

-- 2. Fundraising drafts table
CREATE TABLE IF NOT EXISTS cf_fundraising_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Partner linkage
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    partner_name TEXT,  -- denormalised; matches frontmatter `partner` field; used when no CRM match yet

    -- Output classification
    audience_profile TEXT NOT NULL CHECK (audience_profile IN ('A','B','C','D','E','F','G','H','any')),
    output_type TEXT NOT NULL,  -- briefing, faq, talking-points, personal-letter, reframe, pushback, difficult-conversation

    -- File pointer (canonical source of truth)
    file_path TEXT NOT NULL UNIQUE,  -- relative to repo root

    -- NotebookLM provenance
    notebook_id TEXT,
    conversation_id TEXT,
    prompt_id TEXT,  -- which prompt-library entry produced this

    -- Output stats
    word_count INTEGER,
    references_count INTEGER,
    drift_summary JSONB DEFAULT '{}'::jsonb,  -- {PASS, AMBIGUOUS, DRIFT, MISSING}

    -- Outreach state
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'reviewed', 'sent', 'responded', 'archived')),
    sent_at TIMESTAMPTZ,
    sent_to TEXT,  -- email or contact name actually sent to (free-form)
    response_status TEXT,  -- e.g. 'awaiting', 'positive', 'declined', 'no-response'
    response_at TIMESTAMPTZ,

    -- Free-form
    notes TEXT,

    -- Timestamps
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cf_drafts_org ON cf_fundraising_drafts(organization_id);
CREATE INDEX IF NOT EXISTS idx_cf_drafts_partner_name ON cf_fundraising_drafts(partner_name);
CREATE INDEX IF NOT EXISTS idx_cf_drafts_audience ON cf_fundraising_drafts(audience_profile);
CREATE INDEX IF NOT EXISTS idx_cf_drafts_status ON cf_fundraising_drafts(status);
CREATE INDEX IF NOT EXISTS idx_cf_drafts_generated_at ON cf_fundraising_drafts(generated_at DESC);

-- updated_at trigger (re-use existing function if it exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_cf_drafts_updated_at') THEN
    CREATE TRIGGER set_cf_drafts_updated_at
      BEFORE UPDATE ON cf_fundraising_drafts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- trigger function not in this DB; skip silently
  NULL;
END $$;

-- ============================================
-- GRANTs (management-API migrations need explicit grants per CLAUDE.md)
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON cf_fundraising_drafts TO anon, authenticated, service_role;

-- ============================================
-- View: drafts joined with org details (convenience for CRM queries)
-- ============================================
CREATE OR REPLACE VIEW cf_fundraising_drafts_with_org AS
SELECT
    d.*,
    o.name AS org_name,
    o.org_type,
    o.is_funder,
    o.relationship_status,
    o.cf_audience_profile AS org_audience_profile
FROM cf_fundraising_drafts d
LEFT JOIN organizations o ON d.organization_id = o.id;

GRANT SELECT ON cf_fundraising_drafts_with_org TO anon, authenticated, service_role;

-- ============================================
-- Optional RLS — open for now (single-user CRM); tighten if multi-user
-- ============================================
ALTER TABLE cf_fundraising_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cf_drafts_all" ON cf_fundraising_drafts;
CREATE POLICY "cf_drafts_all" ON cf_fundraising_drafts
  FOR ALL TO authenticated, anon
  USING (true) WITH CHECK (true);
