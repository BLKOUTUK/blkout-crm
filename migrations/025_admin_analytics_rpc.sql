-- 025_admin_analytics_rpc.sql — comms /admin/analytics (Sun 11 Oct 2026)
-- Applied via mcp__supabase__apply_migration as `admin_analytics_rpc` on 11 Oct 2026.
--
-- Purpose: one read for the /admin/analytics page (Rob, 11 Oct: "an analytics page on comms
-- dashboard with key data that report on our engagement, followers, members, Hub, newsletter
-- opens"). Same shape as 017's admin_finance_snapshot(): the metrics schema is not exposed over
-- PostgREST and metrics.* has no grant to any API role, so the read runs SECURITY DEFINER,
-- service_role-only, from comms-blkout's own server behind a session bearer.
--
-- Returns every stored snapshot row (all periods, all statuses) for the reach, followers,
-- members, Hub, newsletter and engagement measures. Failed and absent rows are returned too:
-- the page shows them as gaps with their reason, never as zeroes.
--
-- Deliberately excluded: gestures.unmet and gestures.unmet_over_window. Rob, 28 Aug 2026:
-- never render an "unmet" count on a dashboard — broadcast touches are invisible to the
-- feed, so the number overstates who has gone unmet. It stays on the board numbers page.

CREATE OR REPLACE FUNCTION public.admin_analytics_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, metrics, pg_temp
AS $$
  SELECT jsonb_build_object(
    'rows', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'measure',  s.measure,
               'period',   s.period,
               'value',    s.value,
               'status',   s.status,
               'source',   s.source,
               'taken_at', s.taken_at,
               'detail',   s.detail) ORDER BY s.measure, s.period), '[]'::jsonb)
      FROM metrics.snapshots s
      WHERE (s.measure LIKE 'web.%'
          OR s.measure LIKE 'instagram.%'
          OR s.measure LIKE 'newsletter.%'
          OR s.measure LIKE 'hub.%'
          OR s.measure LIKE 'memberships.%'
          OR s.measure LIKE 'gestures.%'
          OR s.measure LIKE 'events.interest.%'
          OR s.measure IN ('events.rsvps', 'news.voting.votes'))
        AND s.measure NOT LIKE 'gestures.unmet%'),
    'generated_at', now()
  )
$$;

ALTER FUNCTION public.admin_analytics_snapshot() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.admin_analytics_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_snapshot() TO service_role;

-- PostgREST only sees a new function after its schema cache reloads.
NOTIFY pgrst, 'reload schema';
