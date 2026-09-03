-- 013_funding_admin_reads.sql (2026-09-03) — Tier 2 / Funding repoint
-- Applied to production as migration `funding_admin_reads` on 3 Sep 2026.
-- grant_pipeline had RLS on and zero policies, so only service_role could read it —
-- which is why comms /admin/fundraising kept reading the stale `grants` table.
-- Writers (CRM, Mission Control) use service_role / direct Postgres and are unaffected.
-- opportunity_pipeline and bid_writing_progress are VIEWS (RLS does not apply): anon
-- holds no grant on either; authenticated does, and reads them through the view owner.
DROP POLICY IF EXISTS grant_pipeline_admin_select ON public.grant_pipeline;
CREATE POLICY grant_pipeline_admin_select ON public.grant_pipeline
  FOR SELECT TO authenticated USING (is_current_user_admin());
