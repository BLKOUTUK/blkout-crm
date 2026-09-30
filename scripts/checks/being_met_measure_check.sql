-- being_met_measure_check.sql — spec section 7.5 retirement test, "the instrument can show a miss".
-- Run as ONE statement batch (mcp__supabase__execute_sql). It inserts four test rows inside a
-- transaction, reads them back through BOTH definitions, and ROLLS BACK: nothing is committed,
-- no acknowledgment webhook is queued (pg_net's queue insert is rolled back with it).
-- Afterwards run the leftover query at the foot; it must return 0.
--
-- Each row reports what the OLD definition (metrics.being_met_live as 014 defined it, applied row
-- by row) and the NEW definition (metrics.being_met_rows, 025) make of the same row.
-- The check counts only if the old column shows FAIL and the new column shows PASS.
BEGIN;

INSERT INTO public.first_gestures
  (person_ref, person_name, surface, gesture, source_table, occurred_at, met_at, status,
   backfilled, delivery_outcome, notes)
VALUES
 -- T1: delivered 72 hours after an event signup whose window is 48 hours
 ('rob+bm-late@blkoutuk.com',     'Test', 'events',  'being-met check T1 late',       'being-met-check',
  now() - interval '5 days', now() - interval '5 days' + interval '72 hours', 'test', false, 'delivered', 'check T1'),
 -- T2: a backfilled row whose met_at equals its gesture time (the hub batch shape)
 ('rob+bm-backfill@blkoutuk.com', 'Test', 'events',  'being-met check T2 backfilled', 'being-met-check',
  now() - interval '5 days', now() - interval '5 days', 'test', true, NULL, 'check T2'),
 -- T3: a send recorded one hour after the claim, which bounced
 ('rob+bm-bounce@blkoutuk.com',   'Test', 'compass', 'being-met check T3 bounced',    'being-met-check',
  now() - interval '5 days', now() - interval '5 days' + interval '1 hour', 'test', false, 'bounced', 'check T3'),
 -- T4: control. Delivered within the window. Must read as kept, so the check cannot pass by
 --     calling everything missed.
 ('rob+bm-kept@blkoutuk.com',     'Test', 'compass', 'being-met check T4 kept',       'being-met-check',
  now() - interval '5 days', now() - interval '5 days' + interval '1 hour', 'test', false, 'delivered', 'check T4');

WITH t AS (
  SELECT r.*,
         -- OLD definition, verbatim from 014: met_in_window = met_at <= occurred_at + 48h;
         -- met = met_at IS NOT NULL; unmet_over_window = met_at IS NULL past 48h.
         CASE WHEN r.met_at IS NOT NULL AND r.met_at <= r.occurred_at + interval '48 hours' THEN 'on time'
              WHEN r.met_at IS NOT NULL THEN 'met'
              WHEN r.occurred_at < now() - interval '48 hours' THEN 'unmet over window'
              ELSE 'unmet' END AS old_reading
  FROM metrics.being_met_rows r
  WHERE r.id IN (SELECT id FROM public.first_gestures WHERE source_table = 'being-met-check')
)
SELECT left(gesture, 32) AS test_row,
       old_reading,
       CASE WHEN gesture LIKE '%T1%' THEN CASE WHEN old_reading = 'unmet over window' THEN 'pass' ELSE 'FAIL: late row reads as ' || old_reading END
            WHEN gesture LIKE '%T2%' THEN CASE WHEN old_reading <> 'on time' THEN 'pass' ELSE 'FAIL: backfilled row reads as on time' END
            WHEN gesture LIKE '%T3%' THEN CASE WHEN old_reading LIKE 'unmet%' THEN 'pass' ELSE 'FAIL: bounced send reads as ' || old_reading END
            WHEN gesture LIKE '%T4%' THEN CASE WHEN old_reading = 'on time' THEN 'pass' ELSE 'FAIL' END END AS old_verdict,
       state AS new_state, in_measure, miss_reason,
       CASE WHEN gesture LIKE '%T1%' THEN CASE WHEN state = 'missed' THEN 'PASS' ELSE 'FAIL' END
            -- T2 must be out of the measure (a test row is out anyway, so T2-live below checks the real batch)
            WHEN gesture LIKE '%T2%' THEN CASE WHEN NOT in_measure AND state = 'excluded_backfilled' THEN 'PASS' ELSE 'FAIL: reads as ' || state END
            WHEN gesture LIKE '%T3%' THEN CASE WHEN state = 'missed' THEN 'PASS' ELSE 'FAIL' END
            WHEN gesture LIKE '%T4%' THEN CASE WHEN state = 'kept' THEN 'PASS' ELSE 'FAIL' END END AS new_verdict
FROM t
UNION ALL
-- T2-live: the REAL backfilled live rows (88 on 30 Sep 2026). Old: counted on time by met_in_window.
-- New: none of them may be in the measure, and being_met_live.met_in_window may not count them.
SELECT 'T2-live real backfilled rows',
       (SELECT count(*) FROM public.first_gestures WHERE backfilled AND status IS NULL
          AND met_at IS NOT NULL AND met_at <= occurred_at + interval '48 hours')::text || ' read on time (old)',
       CASE WHEN (SELECT count(*) FROM public.first_gestures WHERE backfilled AND status IS NULL
          AND met_at IS NOT NULL AND met_at <= occurred_at + interval '48 hours') > 0
            THEN 'FAIL: backfilled rows read as on time' ELSE 'pass' END,
       (SELECT count(*) FROM metrics.being_met_rows WHERE backfilled AND in_measure)::text || ' in measure',
       false, NULL,
       CASE WHEN (SELECT count(*) FROM metrics.being_met_rows WHERE backfilled AND in_measure) = 0
             AND (SELECT count(*) FROM metrics.being_met_rows WHERE backfilled AND status IS NULL) > 0
            THEN 'PASS' ELSE 'FAIL' END
ORDER BY 1;

ROLLBACK;

-- Leftover check (run separately; must return 0):
-- SELECT count(*) FROM public.first_gestures WHERE source_table = 'being-met-check' OR person_ref LIKE 'rob+bm-%';
