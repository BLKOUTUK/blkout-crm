-- 010_close_anon_reads.sql — part 1 (2026-09-03)
-- Applied to production as migration `close_anon_reads_part1` on 3 Sep 2026.
-- Closes unauthenticated reads verified live on 3 Sep 2026 (comms-blkout admin review).
-- Every reader was traced before each policy was dropped; see
-- apps/comms-blkout/docs/admin-dashboard-review-2026-09-03.md.

-- contacts (3,294 rows readable by anon). Server-side readers use service_role
-- (CRM routes/pages, ivor-core cron, events-calendar edge functions). The only
-- anon-key reader was events-calendar getContacts(), which has no callers.
DROP POLICY IF EXISTS public_view_contacts ON public.contacts;

-- hub_members (81 rows). Only reader is the Herald handler, which uses service_role.
DROP POLICY IF EXISTS "Allow anon read access to hub_members" ON public.hub_members;

-- cf_fundraising_drafts (17 rows). comms-blkout reads the *view*, which runs as
-- its owner (no security_invoker) and so bypasses RLS — the view's anon grant was
-- the live exposure, not just the table policy. Admin pages hold a Supabase
-- session (authenticated); the Python sync uses service_role.
DROP POLICY IF EXISTS cf_drafts_all ON public.cf_fundraising_drafts;
CREATE POLICY cf_drafts_authenticated_read ON public.cf_fundraising_drafts
  FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.cf_fundraising_drafts FROM anon;
REVOKE ALL ON public.cf_fundraising_drafts_with_org FROM anon;

-- news_votes (45 rows; PUBLIC could also insert and delete every vote).
-- news-blkout's /api/vote and /api/user-vote run server-side on service_role.
DROP POLICY IF EXISTS "Anyone can view votes" ON public.news_votes;
DROP POLICY IF EXISTS "Anyone can vote" ON public.news_votes;
DROP POLICY IF EXISTS "Anyone can delete by voter_id" ON public.news_votes;

-- newsletter_preferences is closed in 011 once comms-blkout's /preferences
-- page no longer reads it from the browser.
