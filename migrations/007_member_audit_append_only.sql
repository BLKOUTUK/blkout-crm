-- ============================================
-- 007_member_audit_append_only.sql
-- Member Pages — Spec 01 · applied 27 July 2026
--
-- WHY THIS EXISTS
-- 006 granted SELECT, INSERT on member_data_audit to service_role and its
-- comment claimed the table was append-only. Verification after applying it
-- showed service_role still held UPDATE, DELETE and TRUNCATE: Supabase's
-- default privileges on the public schema had already granted ALL, and a
-- GRANT is additive, not restrictive. The migration reported success and the
-- guarantee it documented was false.
--
-- Two layers, because a grant alone would not stop a SQL-editor session:
--   1. revoke the privileges explicitly
--   2. a trigger that refuses UPDATE and DELETE regardless of grants
--
-- Verified behaviourally, not just structurally:
--   insert=ok  update_blocked=t  delete_blocked=t
-- ============================================

REVOKE UPDATE, DELETE, TRUNCATE ON member_data_audit FROM service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON member_data_audit FROM anon, authenticated;

CREATE OR REPLACE FUNCTION member_data_audit_is_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'member_data_audit is append-only: % is not permitted. This table holds BLKOUT''s prior assessments after a member has overwritten them, and the evidence that member edits were honoured.',
    TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_member_data_audit_no_update ON member_data_audit;
CREATE TRIGGER trg_member_data_audit_no_update
  BEFORE UPDATE OR DELETE ON member_data_audit
  FOR EACH ROW EXECUTE FUNCTION member_data_audit_is_append_only();
