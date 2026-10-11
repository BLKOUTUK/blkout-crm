-- 026_stop_collecting_retired_unmet.sql (Sun 11 Oct 2026). Applied via mcp__supabase__apply_migration
-- as `stop_collecting_retired_unmet`.
-- Rob, 11 Oct 2026: stop collecting the retired 48-hour-window measure (retired 29 Sep 2026).
-- Removes the gestures.unmet, gestures.unmet_over_window and gestures.met_in_window writes from
-- metrics.collect_internal by editing the live definition in place (anchored, checked). Existing
-- rows stay as history. The weekly alarm job (cron jobid 3, metrics.alarm_unmet) was already
-- inactive since 5 Oct 2026.
DO $mig$
DECLARE
  d text := pg_get_functiondef('metrics.collect_internal'::regproc);
  l1 text := E'  PERFORM public.metrics_snapshot_put(per, ''gestures.unmet'', bm.unmet, jsonb_build_object(''origin'',''metrics.being_met_live''), src); n := n + 1;\n';
  l2 text := E'  PERFORM public.metrics_snapshot_put(per, ''gestures.unmet_over_window'', bm.unmet_over_window, jsonb_build_object(''origin'',''metrics.being_met_live'',''window_hours'',48,''alarm'',true), src); n := n + 1;\n';
  l3 text := E'  PERFORM public.metrics_snapshot_put(per, ''gestures.met_in_window'', bm.met_in_window, jsonb_build_object(''origin'',''metrics.being_met_live'',''of_total'',bm.gestures_total), src); n := n + 1;\n';
BEGIN
  IF position(l1 in d) = 0 OR position(l2 in d) = 0 OR position(l3 in d) = 0 THEN
    RAISE EXCEPTION 'anchor line not found; function not changed';
  END IF;
  d := replace(replace(replace(d, l1, ''), l2, ''), l3, '');
  IF d ~ 'unmet|met_in_window' THEN RAISE EXCEPTION 'retired measure still present'; END IF;
  EXECUTE d;
END
$mig$;
