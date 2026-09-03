-- 012_scope_write_policies.sql (2026-09-03) — Tier 1 item 4, part 1
-- Applied to production as migration `scope_write_policies_part1` on 3 Sep 2026.
-- Every policy below let anon or PUBLIC write unconditionally. Writers were traced
-- across apps/, repos/, missioncontrol/, grenada/ and tools/ before each change;
-- server-side writers use service_role and bypass RLS. Verified afterwards by
-- evaluating the real policies as anon and as the admin session (SET ROLE +
-- request.jwt.claims) — see apps/comms-blkout/docs/december-horizon-2026-09-03.md.
--
-- Left in place, with the reason (needs app-level auth or a scoped policy designed
-- against a live flow, not a drop): compass_access_codes anon UPDATE (Ivor's Compass
-- code redemption), dr_participants anon UPDATE (DiaspoRainbow identity),
-- interview_panels/interview_sessions anon UPDATE (Compass interviews),
-- seen_curators/seen_playlists/seen_tracks anon ALL and watching_brief_posts anon
-- UPDATE (the `seen` app's admin queue runs on the anon key with no login),
-- land_studio_episodes PUBLIC write (static studio page under ~/grenada),
-- events anon SELECT of draft/pending rows, event_rsvps PUBLIC SELECT,
-- financial_transactions PUBLIC SELECT (intended public, table empty),
-- and every INSERT-only public-form policy (event_interest, campaign_signups, …).

-- ── Dead tables: nothing in the estate reads or writes them ──────────────────
DROP POLICY IF EXISTS "Allow all access to admin_stats" ON public.admin_stats;
DROP POLICY IF EXISTS "Anyone can manage reports" ON public.analytics_reports;
DROP POLICY IF EXISTS "Anyone can manage feeds" ON public.calendar_feeds;
DROP POLICY IF EXISTS "Service write category analytics" ON public.category_analytics;
DROP POLICY IF EXISTS "Service write event analytics" ON public.event_analytics;
DROP POLICY IF EXISTS "Anyone can manage capacity" ON public.event_capacity;
DROP POLICY IF EXISTS "Anyone can manage moderation" ON public.event_moderation;
DROP POLICY IF EXISTS "Anyone can manage organizers" ON public.event_organizers;
DROP POLICY IF EXISTS "Anyone can manage reports" ON public.event_reports;
DROP POLICY IF EXISTS "Anyone can create reports" ON public.event_reports;
DROP POLICY IF EXISTS "Allow all operations on event_reviews" ON public.event_reviews;
DROP POLICY IF EXISTS "Users can review events" ON public.event_reviews;
DROP POLICY IF EXISTS "Service write geographic analytics" ON public.geographic_analytics;
DROP POLICY IF EXISTS "Anyone can manage memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Service write liberation metrics" ON public.liberation_metrics;
DROP POLICY IF EXISTS "Service write platform analytics" ON public.platform_analytics;
DROP POLICY IF EXISTS "Allow all operations on published_events" ON public.published_events;
DROP POLICY IF EXISTS "Anyone can subscribe to notifications" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete own subscriptions" ON public.notification_subscriptions;
DROP POLICY IF EXISTS "Anyone can update own subscriptions" ON public.notification_subscriptions;

-- ── Server-only writers (service_role) ───────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can manage groups" ON public.community_groups;   -- ivor-core; public read policy stays
DROP POLICY IF EXISTS "Enable insert for anon" ON public.moderation_log;       -- community-platform api/* only
DROP POLICY IF EXISTS "Enable read for anon" ON public.moderation_log;

-- ── Rating/analytics tables: the only browser writers are unrendered components.
--    Separate public SELECT policies exist on each, so reads are unchanged. ──
DROP POLICY IF EXISTS "Allow all operations on content_analytics" ON public.content_analytics;
DROP POLICY IF EXISTS "Allow all operations on content_engagement" ON public.content_engagement;
DROP POLICY IF EXISTS "Users can track engagement" ON public.content_engagement;
DROP POLICY IF EXISTS "Allow all operations on content_ratings" ON public.content_ratings;
DROP POLICY IF EXISTS "Users can rate content" ON public.content_ratings;
DROP POLICY IF EXISTS "Allow all operations on weekly_highlights" ON public.weekly_highlights;

-- ── moderation_queue: was ALL for PUBLIC (2,038 rows). The events→queue trigger
--    ran as the submitting role, so it now runs as its owner; admins keep access. ─
ALTER FUNCTION public.add_event_to_moderation_queue() SECURITY DEFINER SET search_path = public;
DROP POLICY IF EXISTS "Allow all access to moderation_queue" ON public.moderation_queue;
CREATE POLICY moderation_queue_admin_all ON public.moderation_queue
  FOR ALL TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- ── social_media_queue: a PUBLIC "Service role full access" beside the real one ─
DROP POLICY IF EXISTS "Service role full access" ON public.social_media_queue;
CREATE POLICY social_media_queue_admin_all ON public.social_media_queue
  FOR ALL TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- ── socialsync_agent_tasks: comms admin pages read/write as authenticated ────
DROP POLICY IF EXISTS allow_all_select_tasks ON public.socialsync_agent_tasks;
DROP POLICY IF EXISTS allow_all_insert_tasks ON public.socialsync_agent_tasks;
DROP POLICY IF EXISTS allow_all_update_tasks ON public.socialsync_agent_tasks;
DROP POLICY IF EXISTS allow_all_delete_tasks ON public.socialsync_agent_tasks;
CREATE POLICY socialsync_agent_tasks_admin_all ON public.socialsync_agent_tasks
  FOR ALL TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- ── news_articles (1,304 rows): PUBLIC insert/delete, UPDATE open to anon ────
DROP POLICY IF EXISTS "Service role can insert articles" ON public.news_articles;
DROP POLICY IF EXISTS "Service role can delete articles" ON public.news_articles;
DROP POLICY IF EXISTS "Service role can update articles" ON public.news_articles;
CREATE POLICY news_articles_service_all ON public.news_articles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY news_articles_admin_all ON public.news_articles
  FOR ALL TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

-- ── events: anon could move any pending event to approved. The events-calendar
--    moderation component runs behind a Supabase session, covered by
--    "Admins can update events for moderation". ─
DROP POLICY IF EXISTS "Allow anonymous moderation actions" ON public.events;

-- ── event_rsvps: RSVP writes go through ivor-core (service_role). PUBLIC SELECT
--    closed too (applied separately as `scope_rsvp_read`, same day): the table
--    holds attendee_email, is empty today, and fills when membership opens on
--    28 Dec — after development capacity has ended. ─
DROP POLICY IF EXISTS "Anyone can create RSVPs" ON public.event_rsvps;
DROP POLICY IF EXISTS "Anyone can update RSVPs" ON public.event_rsvps;
DROP POLICY IF EXISTS "Anyone can view RSVPs" ON public.event_rsvps;
CREATE POLICY event_rsvps_admin_select ON public.event_rsvps
  FOR SELECT TO authenticated USING (is_current_user_admin());

-- ── financial_transactions: anyone could insert into a public transparency table ─
DROP POLICY IF EXISTS "Anon can insert transactions" ON public.financial_transactions;

-- ── users: any authenticated user could read and rewrite every row ───────────
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow login lookup by email" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert (signup)" ON public.users;
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
