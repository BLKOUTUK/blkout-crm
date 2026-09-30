-- 008_metrics_views.sql
-- THE METRICS LAYER — single sanctioned source for any number quoted about the platform.
-- Rule: a figure reported to Rob comes from a metrics.* view queried in the same turn,
-- never from a hand-written query, a cached counter, or a remembered value.
-- Each view IS the definition of its metric; changing a definition means editing this
-- file (visible diff), not improvising a different query.
--
-- The metrics schema is NOT exposed via PostgREST (only `public` is in the API config),
-- so nothing here widens the app-facing surface. Access is service-role / direct SQL only.
--
-- NUMBERS THAT DO NOT LIVE HERE (external sanctioned sources — never answer from a mirror):
--   * BLKOUTHUB members / groups  → live Heartbeat API (public.hub_members is a STALE MIRROR)
--   * Newsletter subscribers      → SendFox API, counting confirmed_at IS NOT NULL only
--   * Site traffic                → Plausible (baseline ~380/mo is a floor, not a figure)
--   * Cash position               → bookkeeping system, not this database

CREATE SCHEMA IF NOT EXISTS metrics;

GRANT USAGE ON SCHEMA metrics TO service_role;

-- Signups of interest per event (picnic-2026, gbp-paris-2026, future doors).
-- Definition: one row in event_interest = one signup. This table, never event_rsvps,
-- holds picnic-style interest signups.
CREATE OR REPLACE VIEW metrics.event_interest_by_event AS
SELECT event_slug,
       count(*)                                    AS signups,
       count(*) FILTER (WHERE could_help_organise) AS could_help_organise,
       min(signed_up_at)                           AS first_signup_at,
       max(signed_up_at)                           AS latest_signup_at
FROM public.event_interest
GROUP BY event_slug;

-- Formal RSVPs per calendar event (distinct system from event_interest).
CREATE OR REPLACE VIEW metrics.event_rsvps_by_event AS
SELECT r.event_id,
       e.title                                   AS event_title,
       e.date                                    AS event_date,
       count(*)                                  AS rsvps,
       coalesce(sum(r.guest_count), 0)           AS guests,
       count(*) FILTER (WHERE r.checked_in)      AS checked_in
FROM public.event_rsvps r
LEFT JOIN public.events e ON e.id = r.event_id
GROUP BY r.event_id, e.title, e.date;

-- Being-met prime metric. Definitions from the table's own contract:
--   live       = status IS NULL
--   unmet queue = status IS NULL AND met_at IS NULL
--   met        = status IS NULL AND met_at IS NOT NULL
CREATE OR REPLACE VIEW metrics.first_gestures_summary AS
SELECT count(*)                                                                              AS total_rows,
       count(*) FILTER (WHERE status IS NULL)                                                AS live,
       count(*) FILTER (WHERE status IS NULL AND met_at IS NULL)                             AS unmet_queue,
       count(*) FILTER (WHERE status IS NULL AND met_at IS NOT NULL)                         AS met,
       count(*) FILTER (WHERE status IS NULL AND met_at IS NULL AND acknowledged_at IS NOT NULL)
                                                                                             AS acknowledged_awaiting_met,
       max(occurred_at)                                                                      AS latest_gesture_at
FROM public.first_gestures;

-- Full status breakdown, including values in use beyond the documented set
-- (ally / board / collaborator / internal observed 27 Aug 2026) — kept visible so
-- definition drift surfaces instead of hiding inside a summary.
CREATE OR REPLACE VIEW metrics.first_gestures_by_status AS
SELECT coalesce(status, 'live') AS status,
       count(*)                 AS rows,
       count(*) FILTER (WHERE met_at IS NOT NULL) AS met
FROM public.first_gestures
GROUP BY coalesce(status, 'live');

-- Funding bids — grant_pipeline is the CRM source of truth (split-brain rule).
CREATE OR REPLACE VIEW metrics.grant_pipeline_live AS
SELECT grant_name,
       grant_program,
       stage::text        AS stage,
       amount_requested,
       amount_awarded,
       deadline,
       submitted_at,
       decision_expected,
       decision_received,
       updated_at
FROM public.grant_pipeline
ORDER BY (stage::text IN ('preparing', 'submitted')) DESC, deadline NULLS LAST;

-- Active news voting period, with votes counted from the news_votes ledger.
-- cached_* columns are the denormalised counters kept on voting_periods; if they
-- disagree with the ledger, the ledger is the number and the drift is the finding.
CREATE OR REPLACE VIEW metrics.news_voting_current AS
SELECT vp.period_number,
       vp.start_date,
       vp.end_date,
       count(DISTINCT na.id) AS articles_in_period,
       count(nv.id)          AS votes_ledger,
       vp.total_articles     AS cached_total_articles,
       vp.total_votes        AS cached_total_votes
FROM public.voting_periods vp
LEFT JOIN public.news_articles na ON na.voting_period_id = vp.id
LEFT JOIN public.news_votes nv    ON nv.article_id = na.id
WHERE vp.status = 'active'
GROUP BY vp.id;

-- CBS membership by tier and status. Empty until Beam Day (28 Dec 2026) opens
-- membership — a zero from this view is a true zero, not a wiring gap.
CREATE OR REPLACE VIEW metrics.memberships_by_tier AS
SELECT tier::text   AS tier,
       status::text AS status,
       count(*)     AS members
FROM public.memberships
GROUP BY tier, status;

-- Tool/SaaS subscription burn (the subscription audit), active services only.
CREATE OR REPLACE VIEW metrics.tool_subscriptions_cost AS
SELECT count(*)                          AS active_subscriptions,
       round(sum(monthly_cost_gbp), 2)   AS monthly_cost_gbp,
       round(sum(annual_cost_gbp), 2)    AS annual_cost_gbp,
       max(last_invoice_at)              AS latest_invoice_seen
FROM public.subscriptions
WHERE active;

GRANT SELECT ON ALL TABLES IN SCHEMA metrics TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA metrics GRANT SELECT ON TABLES TO service_role;
