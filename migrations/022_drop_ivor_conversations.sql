-- ============================================
-- Drop ivor_conversations
-- Broken since Feb 2026 (documented 400 error, frontend/schema mismatch in code
-- that no longer exists — zero current references anywhere in the monorepo).
-- ivor_feedback is the working analytics source; comms-blkout's
-- member_activity_dashboard view is repointed to it separately.
-- ============================================

DROP TABLE IF EXISTS public.ivor_conversations CASCADE;
