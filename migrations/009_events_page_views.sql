-- 009_events_page_views.sql
-- THE NOTE on events.blkoutuk.com — "how this page is kept" — is data-backed, not written copy,
-- or it becomes the next stale artefact. This file IS the definition of those figures.
-- Rule (008 header still applies): a figure quoted about the events page comes from
-- metrics.events_page_state, queried in the same turn. Change a definition here, never in the app.
--
-- Deliberate exception to "metrics is never exposed": public.events_page_note re-publishes this
-- ONE row to anon, because transparency to the reader is the point of the Note. Nothing else in
-- the metrics schema is reachable through it.
--
-- Depends on: public.gatherings_live, public.openings_live, public.openings
-- (apps/events-calendar/supabase/migrations/20260828_openings.sql).
-- Applied via mcp__supabase__apply_migration as `events_page_views` on 28 Aug 2026.

CREATE OR REPLACE VIEW metrics.events_page_state AS
WITH upcoming AS (
  SELECT id FROM public.events
  WHERE status IN ('approved','published') AND date >= current_date
),
live AS (
  SELECT id FROM public.gatherings_live
),
turned_away AS (
  -- Reasons are normalised to short public labels; the raw strings stay in the table.
  SELECT CASE
    WHEN r ~* 'rolled a past event forward'                 THEN 'rolled forward a year by the scraper'
    WHEN r ~* 'past event'                                  THEN 'already happened'
    WHEN r ~* 'listing page|homepage|social account'        THEN 'a listings page, not an event'
    WHEN r ~* 'duplicate'                                   THEN 'a duplicate'
    WHEN r ~* 'description spill|not a venue'               THEN 'no real venue'
    WHEN r ~* 'boilerplate'                                 THEN 'boilerplate, not an event'
    WHEN r ~* 'community guidelines|wrong_audience|not_uk'  THEN 'not for this community'
    WHEN r IS NULL OR btrim(r) = ''                         THEN 'no reason recorded (automated)'
    ELSE 'other'
  END AS reason
  FROM (
    SELECT coalesce(nullif(btrim(rejection_reason), ''), nullif(btrim(moderation_reason), '')) AS r
    FROM public.events
    WHERE status = 'rejected'
      AND coalesce(rejected_at, moderated_at, updated_at) >= now() - interval '30 days'
  ) x
),
feeds AS (
  SELECT feed, max(created_at) AS last_delivered
  FROM (
    SELECT CASE
      WHEN source ILIKE 'outsavvy%'                                   THEN 'OutSavvy'
      WHEN source = 'Web Search' OR source ILIKE 'tavily%'            THEN 'web discovery'
      WHEN source = 'Marlborough Productions'                         THEN 'Marlborough Productions'
      WHEN source IN ('chrome-extension','partner-share','admin-quick-add','community-submission','form')
                                                                      THEN 'hand-submitted'
    END AS feed, created_at
    FROM public.events
  ) f
  WHERE feed IS NOT NULL
  GROUP BY feed
)
SELECT
  (SELECT count(*) FROM live)                                                    AS gatherings_live,
  (SELECT count(*) FROM upcoming) - (SELECT count(*) FROM live)                  AS gatherings_held,
  (SELECT max(coalesce(moderated_at, rejected_at, approved_at, updated_at))
     FROM public.events
    WHERE moderation_reason IS NOT NULL OR rejection_reason IS NOT NULL
       OR moderated_by IS NOT NULL OR approved_by IS NOT NULL)                   AS last_human_check,
  (SELECT count(*) FROM turned_away)                                             AS turned_away_30d,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'n', n) ORDER BY n DESC), '[]'::jsonb)
     FROM (SELECT reason, count(*) AS n FROM turned_away GROUP BY reason) t)     AS turned_away_reasons,
  (SELECT coalesce(jsonb_agg(jsonb_build_object(
            'feed', feed,
            'last_delivered', last_delivered,
            'days_since', floor(extract(epoch FROM (now() - last_delivered)) / 86400)::int,
            'automated', feed <> 'hand-submitted') ORDER BY feed), '[]'::jsonb)
     FROM feeds)                                                                 AS feeds,
  (SELECT count(*) FROM public.openings_live)                                    AS openings_open,
  (SELECT count(*) FROM public.openings_live
    WHERE deadline IS NOT NULL AND deadline <= current_date + 7)                 AS openings_closing_7d,
  (SELECT count(*) FROM public.openings WHERE status = 'pending')                AS openings_waiting,
  now()                                                                          AS generated_at;

CREATE OR REPLACE VIEW public.events_page_note AS
SELECT * FROM metrics.events_page_state;

GRANT SELECT ON public.events_page_note TO anon, authenticated, service_role;
