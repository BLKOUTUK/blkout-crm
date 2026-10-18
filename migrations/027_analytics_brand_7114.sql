-- 027_analytics_brand_7114.sql (Sun 18 Oct 2026). Applied via mcp__supabase__apply_migration
-- as `analytics_brand_7114`.
-- Rob, 18 Oct 2026: connect the monthly 7-11-4 snapshot (brand.7114.*, written by comms-blkout
-- brand-7114.yml) to the comms admin Analytics page. Adds one prefix to the allow-list of
-- admin_analytics_snapshot(); otherwise identical to 025. Grants are unchanged by OR REPLACE.
CREATE OR REPLACE FUNCTION public.admin_analytics_snapshot()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'metrics', 'pg_temp'
AS $function$
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
          OR s.measure LIKE 'brand.7114.%'
          OR s.measure IN ('events.rsvps', 'news.voting.votes'))
        AND s.measure NOT LIKE 'gestures.unmet%'),
    'generated_at', now()
  )
$function$;
