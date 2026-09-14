-- ============================================
-- Drop ivor_interactions
-- Designed as the IVOR<->CRM contact link (001_crm_complete_schema.sql:568-580) but
-- never built — ivor-core has zero code writing to it, and can't yet: IVOR
-- conversations are fully anonymous today (no email/name captured anywhere).
--
-- Safe to drop: increment_ivor_interactions() (002_function_aliases.sql), the
-- separate manually-triggered path used by the CRM activities endpoint, updates
-- contacts.ivor_interaction_count directly and never touches this table.
-- ============================================

DROP TABLE IF EXISTS public.ivor_interactions CASCADE;
DROP FUNCTION IF EXISTS update_contact_ivor_stats() CASCADE;
