-- 016_admin_dashboard_rpc.sql — comms /admin Tier 3 front page (Thu 10 Sep 2026)
-- Brief: apps/comms-blkout/docs/admin-tier3-brief-2026-09-10.md (WP1). Applied via
-- mcp__supabase__apply_migration as `admin_dashboard_rpc` on 10 Sep 2026.
--
-- Purpose: one read for the /admin front page. `public.open_loops` and every `metrics.*`
-- view have no grant to any API role and the metrics schema is not in PostgREST, so the
-- only way a tile reaches them is a SECURITY DEFINER function called with the service
-- role from comms-blkout's own server (GET /api/admin/dashboard, behind a session bearer).
-- Nothing here is reachable by anon or authenticated — see the REVOKE at the foot.
--
-- Two omissions are deliberate, not oversights:
--   * `first_gestures_summary.unmet_queue` and `being_met_live.unmet` / `unmet_over_window`
--     are NOT returned. Rob, 28 Aug 2026: the ~90 event signups those counts describe were
--     reached by SendFox broadcasts the feed cannot see, so the number is blind. "Who is
--     waiting" on /admin is `public.open_loops` only — notes-bearing and human-judged.
--   * No name filtering here or in the caller: the deceased guard lives in the data layer.

CREATE OR REPLACE FUNCTION public.admin_dashboard_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, metrics, pg_temp
AS $$
  SELECT jsonb_build_object(
    -- Oldest first: the person waiting longest is the top row on the page.
    'open_loops', (
      SELECT coalesce(jsonb_agg(
               jsonb_build_object(
                 'id',             l.id,
                 'person_ref',     l.person_ref,
                 'person_name',    l.person_name,
                 'surface',        l.surface,
                 'gesture',        l.gesture,
                 'met_on',         l.met_on,
                 'days_since_met', l.days_since_met,
                 'notes',          l.notes
               ) ORDER BY l.met_on ASC), '[]'::jsonb)
      FROM public.open_loops l),

    'first_gestures', (
      SELECT jsonb_build_object(
               'total_rows',                f.total_rows,
               'live',                      f.live,
               'met',                       f.met,
               'acknowledged_awaiting_met', f.acknowledged_awaiting_met,
               'latest_gesture_at',         f.latest_gesture_at)
      FROM metrics.first_gestures_summary f),

    'being_met', (
      SELECT jsonb_build_object(
               'met_in_window',           b.met_in_window,
               'landed',                  b.landed,
               'median_hours_to_met_90d', b.median_hours_to_met_90d)
      FROM metrics.being_met_live b),

    'grant_pipeline', (
      SELECT coalesce(jsonb_agg(
               jsonb_build_object(
                 'grant_name',        g.grant_name,
                 'grant_program',     g.grant_program,
                 'stage',             g.stage::text,
                 'amount_requested',  g.amount_requested,
                 'amount_awarded',    g.amount_awarded,
                 'deadline',          g.deadline,
                 'submitted_at',      g.submitted_at,
                 'decision_expected', g.decision_expected,
                 'updated_at',        g.updated_at
               ) ORDER BY g.deadline ASC NULLS LAST), '[]'::jsonb)
      FROM public.grant_pipeline g),

    -- 0 rows today; nothing writes `memberships` until the join path is decided
    -- (~24 Nov board). An empty array is the honest answer, not a substituted number.
    'memberships_by_tier', (
      SELECT coalesce(jsonb_agg(
               jsonb_build_object('tier', m.tier, 'status', m.status, 'members', m.members)
               ORDER BY m.tier, m.status), '[]'::jsonb)
      FROM metrics.memberships_by_tier m),

    'generated_at', now()
  )
$$;

ALTER FUNCTION public.admin_dashboard_snapshot() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.admin_dashboard_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_snapshot() TO service_role;

-- PostgREST only sees a new function after its schema cache reloads.
NOTIFY pgrst, 'reload schema';
