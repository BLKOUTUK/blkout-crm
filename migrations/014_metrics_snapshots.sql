-- 014_metrics_snapshots.sql — analytics v2, phase 1 "Consolidate" (Fri 4 Sep 2026)
-- Design: projects/analytics/docs/analytics-design-v2.md (§3 principles 6–7, §6 architecture).
-- Applied via mcp__supabase__apply_migration as `metrics_snapshots` on 4 Sep 2026.
-- The 008 header rule still applies: a figure quoted about the platform comes from a
-- metrics.* view or a metrics.snapshots row, queried in the same turn.
--
-- 1. metrics.snapshots — THE ONE NEW TABLE, and the exception that proves 008's "views
--    over real tables" rule: it stores the views' own output, dated, because a monthly
--    report must say what a number was on the first of the month and the external
--    sources (Plausible, SendFox, Heartbeat, Coolify, GitHub) cannot recompute history.
--    Written only by: the scheduled collector (phase 2), the ingest function (phase 2),
--    and the baseline import (projects/analytics/sql/002_baseline_import_2026_09_04.sql).
--    Never by application code.
--
--    period   'YYYY-MM' — the month the row describes. Flows (pageviews, sends) cover the
--             month; stocks (a queue, a list size) are as-at taken_at, closing that month.
--    status   ok | failed | absent. failed = the source was asked and did not answer
--             (detail carries the error). absent = the source was not asked (a manual
--             input that did not arrive). A MISSING ROW IS A GAP; nothing writes 0 for a gap.
--    value    the number; NULL unless status = 'ok' (enforced below).
--    detail   breakdowns, raw totals, ids — whatever makes the number auditable.
--    source   'metrics.<view>', 'plausible', 'sendfox', 'heartbeat', 'coolify', 'github',
--             'ingest:<who>', or 'baseline-2026-09-04'.
--
-- 2. Mission Control's Signals tile, moved from public.analytics_* (projects/analytics/
--    sql/001_analytics_views.sql, 6 Jul 2026) into this schema so there is ONE view family.
--    Column names are unchanged so the tile reads the same numbers before and after —
--    that is phase 1's proof. hub_members is dropped from the engagement list: it is a
--    Dec-2025 mirror (81) and the live Hub count comes from Heartbeat (90 on 4 Sep).
--
-- 3. metrics.newsletter_sends — per-send stats from newsletter_editions' own columns,
--    now filled from the SendFox campaigns API (v1's "SendFox is paste-only" premise was
--    false). Backfill for editions 7–11: projects/analytics/sql/003_newsletter_editions_backfill_2026_09_04.sql.

CREATE TABLE IF NOT EXISTS metrics.snapshots (
  id        bigserial   PRIMARY KEY,
  taken_at  timestamptz NOT NULL DEFAULT now(),
  period    text        NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  measure   text        NOT NULL,
  value     numeric,
  detail    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  source    text        NOT NULL,
  status    text        NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'failed', 'absent')),
  -- a clean-looking value on a failed/absent row IS the silent failure; make it impossible
  CONSTRAINT snapshots_value_iff_ok CHECK ((status = 'ok') = (value IS NOT NULL)),
  CONSTRAINT snapshots_one_per_period UNIQUE (period, measure)
);

COMMENT ON TABLE metrics.snapshots IS
  'Dated output of the metrics views and external sources, one row per (period, measure). Written only by the collector, the ingest function and the baseline import. A missing row is a gap, never a zero.';

-- Being-met, exactly as public.analytics_being_met defined it (6 Jul 2026).
-- NB two definitions of "met" exist and both are kept visible:
--   this view's met          = met_at IS NOT NULL, any status            (37 on 4 Sep)
--   first_gestures_summary.met = status IS NULL AND met_at IS NOT NULL  (31 on 4 Sep)
-- The tile uses met_in_window / gestures_total, not met.
CREATE OR REPLACE VIEW metrics.being_met_live AS
SELECT
  count(*)::int                                                          AS gestures_total,
  count(*) FILTER (WHERE occurred_at > now() - interval '30 days')::int  AS gestures_30d,
  count(*) FILTER (WHERE acknowledged_at IS NOT NULL)::int               AS acknowledged,
  count(*) FILTER (WHERE met_at IS NOT NULL)::int                        AS met,
  count(*) FILTER (WHERE met_at IS NOT NULL
                   AND met_at <= occurred_at + interval '48 hours')::int AS met_in_window,
  count(*) FILTER (WHERE met_at IS NULL AND status IS NULL)::int         AS unmet,
  count(*) FILTER (WHERE met_at IS NULL AND status IS NULL
                   AND occurred_at < now() - interval '48 hours')::int   AS unmet_over_window,
  -- time-to-response over the last 90 days only: backfilled Compass claims
  -- were met months late and would swamp the current signal
  round((percentile_cont(0.5) WITHIN GROUP (
    ORDER BY extract(epoch FROM met_at - occurred_at) / 3600.0
  ) FILTER (WHERE met_at IS NOT NULL
            AND occurred_at > now() - interval '90 days'))::numeric, 1)  AS median_hours_to_met_90d,
  -- his half: witnessed, never targeted
  count(*) FILTER (WHERE landed_at IS NOT NULL)::int                     AS landed
FROM public.first_gestures;

-- Engagement counts, witnessed. Same rows as public.analytics_engagement minus hub_members.
CREATE OR REPLACE VIEW metrics.engagement_signals AS
SELECT 'compass_claims' AS signal, count(*)::int AS total,
       count(*) FILTER (WHERE claimed_at > now() - interval '30 days')::int AS last_30d
FROM public.compass_claims
UNION ALL
SELECT 'news_votes', count(*)::int,
       count(*) FILTER (WHERE created_at > now() - interval '30 days')::int
FROM public.news_votes
UNION ALL
SELECT 'event_rsvps', count(*)::int,
       count(*) FILTER (WHERE created_at > now() - interval '30 days')::int
FROM public.event_rsvps
UNION ALL
SELECT 'dr_reflections', count(*)::int,
       count(*) FILTER (WHERE created_at > now() - interval '30 days')::int
FROM public.dr_reflections
UNION ALL
-- editions sent; per-send opens/clicks live in metrics.newsletter_sends
SELECT 'newsletter_editions', count(*)::int,
       count(*) FILTER (WHERE sent_at > now() - interval '30 days')::int
FROM public.newsletter_editions;

-- Per-send newsletter stats. Only editions that went out through SendFox and carry the
-- campaign id; unique_* are SendFox's figures (it does not supply total opens/clicks,
-- so open_count/click_count are NULL on backfilled rows, never 0).
CREATE OR REPLACE VIEW metrics.newsletter_sends AS
SELECT edition_number,
       title,
       subject_line,
       sent_at,
       sendfox_campaign_id,
       recipients_count   AS recipients,
       delivered_count    AS delivered,
       unique_opens,
       unique_clicks,
       open_rate,
       click_rate,
       unsubscribe_count  AS unsubscribes,
       bounce_count       AS bounces,
       metadata -> 'sendfox' AS sendfox
FROM public.newsletter_editions
WHERE status = 'sent' AND sendfox_campaign_id IS NOT NULL
ORDER BY sent_at;

-- Retire the second view family. Mission Control reads metrics.* from this migration on.
DROP VIEW IF EXISTS public.analytics_being_met;
DROP VIEW IF EXISTS public.analytics_engagement;

GRANT SELECT ON ALL TABLES IN SCHEMA metrics TO service_role;
GRANT INSERT, UPDATE ON metrics.snapshots TO service_role;
GRANT USAGE, SELECT ON SEQUENCE metrics.snapshots_id_seq TO service_role;
