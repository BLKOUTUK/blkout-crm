-- 031: a blank median is a gap, never 0 (being-met spec, 30 Sep 2026)
--
-- Found by the phase 1 to 4 review: metrics.collect_internal wrote
--   coalesce(bm.median_hours_to_met_90d, 0)
-- With backfilled rows now excluded, no live gesture has been met in 90 days, so the
-- median is NULL and the 1 Oct 06:00 monthly snapshot would have recorded "0 hours to
-- met", status ok. 0 is a valid number, not an error. The snapshot table's own rule is
-- that a missing measure is a gap, so a NULL median is now written with status 'absent'.
--
-- Additive: replaces one expression inside the existing function. Fails loudly if the
-- anchor text is not found, so it cannot silently do nothing.
--
-- ROLLBACK: re-run migration 015's definition of metrics.collect_internal
-- (apps/crm/migrations/015_metrics_collector.sql).

DO $m$
DECLARE d text; d2 text; d3 text;
BEGIN
  d := pg_get_functiondef('metrics.collect_internal'::regproc);
  d2 := regexp_replace(d, 'coalesce\(bm\.median_hours_to_met_90d,\s*0\)', 'bm.median_hours_to_met_90d');
  IF d2 = d THEN RAISE EXCEPTION 'anchor 1 (coalesce median) not found: collect_internal unchanged'; END IF;
  d3 := regexp_replace(
    d2,
    '(''null_means'',\s*''no one met in 90 days''\)\s*,\s*src)\)',
    E'\\1, CASE WHEN bm.median_hours_to_met_90d IS NULL THEN ''absent'' ELSE ''ok'' END)'
  );
  IF d3 = d2 THEN RAISE EXCEPTION 'anchor 2 (null_means call) not found: collect_internal unchanged'; END IF;
  EXECUTE d3;
END
$m$;
