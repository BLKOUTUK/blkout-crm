-- 011_close_anon_reads_part2.sql (2026-09-03)
-- Applied to production as migration `close_anon_reads_part2` on 3 Sep 2026.
-- newsletter_preferences (11 rows, world-readable and world-writable under
-- public_can_manage_own_preferences). Its only reader was comms-blkout's
-- /preferences page, retired in comms-blkout commit 4bd0334 (deployed and
-- verified 3 Sep 2026). Nothing at send time ever read is_subscribed — sends
-- go from SendFox — so the policy protected a table that changed nothing.
-- admins_can_view_all_preferences (authenticated SELECT) is left in place.
DROP POLICY IF EXISTS public_can_manage_own_preferences ON public.newsletter_preferences;

-- Applied separately as `close_anon_reads_part2_log`, same day:
-- newsletter_unsubscribe_log had anon INSERT (WITH CHECK true) whose only writer
-- was the retired page. Admin SELECT (authenticated) stays.
DROP POLICY IF EXISTS public_can_log_unsubscribe ON public.newsletter_unsubscribe_log;
