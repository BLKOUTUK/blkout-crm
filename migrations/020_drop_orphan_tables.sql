-- 020_drop_orphan_tables.sql
-- Retire four tables nothing reads. 10 September 2026.
--
-- EXPORT FIRST. Every row was written to JSON before this ran, and the export is not in
-- any repository:
--   /home/robbe/blkout/governance/archive/retired-tables-2026-09-10/
--     agent_configurations.json      6 rows    22,603 bytes
--     socialsync_agent_tasks.json  105 rows   175,982 bytes  (87 cancelled, 18 completed;
--                                                             7 carry generated_content)
--     newsletter_subscribers.json    0 rows         2 bytes
--     bid_writing_templates.json     5 rows    11,622 bytes
--     dependent-objects.sql                    the DDL below, so nothing CASCADE removes
--                                              is unrecoverable
--
-- WHAT WAS CHECKED, PER TABLE. Dependents from pg_depend (rewrite rules, i.e. views),
-- pg_policies, pg_trigger and `pg_proc.prosrc ilike '%<table>%'`. Code references across
-- /home/robbe/blkout/platform/apps (comms-blkout, crm, ivor-core, news-blkout,
-- events-calendar, community-platform), /home/robbe/blkout/platform/{packages,scripts,
-- missioncontrol}, /home/robbe/blkout/repos, and all nine Supabase edge functions.
--
-- agent_configurations (6 rows)
--   Policies: "Agent configs are readable by authenticated users" (SELECT),
--             "Only admins can manage agent configurations" (ALL). Both go with the table.
--   Trigger:  update_agents_updated_at -> update_updated_at_column (shared function, stays).
--   Views/functions: none.
--   Code:     the admin agents page was retired in comms PR #35. The one live reference left
--             was the comms /api/health probe, which read this table to prove the database
--             was reachable; it now probes newsletter_editions (comms PR, same day). Docs
--             only otherwise.
--
-- socialsync_agent_tasks (105 rows)
--   Policy:   socialsync_agent_tasks_admin_all (ALL, authenticated) — from crm 012.
--   Views/functions/triggers: none.
--   Code:     the herald cron jobs inserted into it and nothing read those rows back. The
--             inserts were removed in the same comms PR; the jobs now log what they would
--             have queued. The 87 cancelled briefs are in the export.
--
-- newsletter_subscribers (0 rows)
--   Policy:   "Admins can manage newsletter subscribers" (ALL).
--   Trigger:  trigger_newsletter_subscribers_updated_at -> update_newsletter_subscribers_
--             updated_at (function is specific to this table; left in place, see below).
--   View:     member_activity_dashboard — a 13-counter dashboard view, only two of whose
--             counters come from this table. Nothing reads it (metrics.* views are the
--             source for numbers), so CASCADE takes it. Its full definition is in
--             dependent-objects.sql if the other eleven counters are ever wanted back.
--   Functions: get_herald_intelligence(), get_newsletter_content(varchar) and
--             update_subscriber_engagement(varchar,int,int) name this table in their
--             bodies. A plpgsql body is not a tracked dependency, so CASCADE does NOT drop
--             them and they are NOT dropped here. Nothing calls any of the three — only
--             their own defining migrations and one planning doc mention them — and a call
--             would now fail loudly with "relation does not exist" rather than silently.
--             Dropping them is a separate decision; their definitions are in the export.
--   Code:     SendFox is the list of record. Two references remain and neither is live:
--             crm hooks/use-evidence.ts (untracked, not on origin/main, not deployed) and
--             /home/robbe/blkout/platform/scripts/collect-evidence.mjs (a manual script, in
--             no cron, workflow or timer). Both would have reported 0 for ever.
--
-- bid_writing_templates (5 rows)
--   Policy:   "Authenticated users can manage bid templates" (ALL, authenticated).
--   View:     template_analytics (joins bid_documents) — 5 rows, no code reference anywhere.
--             CASCADE takes it; definition kept in dependent-objects.sql. bid_documents is
--             NOT dropped.
--   Functions/triggers: none.
--   Code:     none outside two comms docs.
--
-- NOT DROPPED: cf_fundraising_drafts (17 rows). The Critical Frequency fundraising CLI
-- still writes it — apps/comms-blkout/src/fundraising/fundraising.py and
-- lib/supabase_sync.py — and apps/comms-blkout/src/pages/admin/funding/FundingHub.tsx
-- reads it. Left alone.

BEGIN;

DROP TABLE IF EXISTS public.agent_configurations CASCADE;
DROP TABLE IF EXISTS public.socialsync_agent_tasks CASCADE;
DROP TABLE IF EXISTS public.newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS public.bid_writing_templates CASCADE;

COMMIT;
