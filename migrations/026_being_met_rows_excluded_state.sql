-- 026_being_met_rows_excluded_state.sql — Being met, phase 1 follow-up (Wed 30 Sep 2026)
-- Applied via mcp__supabase__apply_migration as `being_met_rows_excluded_state`.
--
-- Found by the phase 1 check: under 025 a backfilled row was out of the measure (in_measure
-- false) but its state column still read 'kept'. The brief's test is that a backfilled row
-- READS AS EXCLUDED, so the state itself now says so. Same columns, same order: a
-- CREATE OR REPLACE of the view body only. Additive.
--
-- ROLLBACK: re-run section 4a of 025_being_met_record.sql (CREATE OR REPLACE VIEW metrics.being_met_rows ...).

CREATE OR REPLACE VIEW metrics.being_met_rows AS
WITH r AS (
  SELECT g.*,
         p.key            AS promise_key,
         p.row_no         AS promise_row,
         p.window_interval,
         p.window_from,
         p.needs_person,
         p.valid_from     AS promise_valid_from,
         CASE WHEN p.window_interval IS NULL THEN NULL
              WHEN p.window_from = 'confirmation' THEN g.contact_confirmed_at + p.window_interval
              ELSE g.occurred_at + p.window_interval END AS due_at
  FROM public.first_gestures g
  LEFT JOIN public.promises p
         ON g.surface = ANY (p.surfaces) AND p.superseded_at IS NULL AND p.measured_per_person
)
SELECT id, person_ref, person_name, surface, gesture, occurred_at, created_at,
       promise_key, promise_row, due_at, met_at, delivery_method, delivery_outcome,
       delivery_evidence, contact_confirmed_at, miss_cause, repaired_at, backfilled, status,
       landed_at, notes,
       (occurred_at < promise_valid_from) AS before_promise_written,
       (status IS NULL AND NOT backfilled AND promise_key IS NOT NULL) AS in_measure,
       CASE
         WHEN backfilled                                             THEN 'excluded_backfilled'  -- never measured
         WHEN promise_key IS NULL                                    THEN 'no_promise'
         WHEN delivery_outcome IN ('bounced', 'skipped', 'failed')   THEN 'missed'   -- delivered means arrived
         WHEN miss_cause IS NOT NULL                                 THEN 'missed'   -- recorded, never deleted
         WHEN window_from = 'confirmation' AND contact_confirmed_at IS NULL
                                                                     THEN 'unconfirmed'
         WHEN met_at IS NOT NULL AND met_at <= due_at                THEN 'kept'
         WHEN met_at IS NOT NULL                                     THEN 'missed'   -- arrived late
         WHEN now() > due_at                                         THEN 'missed'   -- not arrived, window passed
         ELSE 'pending'
       END AS state,
       CASE
         WHEN backfilled THEN NULL
         WHEN miss_cause IS NOT NULL THEN miss_cause
         WHEN delivery_outcome IN ('bounced', 'skipped', 'failed') THEN 'cause not recorded (send ' || delivery_outcome || ')'
         WHEN met_at IS NOT NULL AND met_at > due_at THEN 'cause not recorded (arrived late)'
         WHEN met_at IS NULL AND now() > due_at THEN 'cause not recorded (nothing arrived)'
       END AS miss_reason
FROM r;
COMMENT ON VIEW metrics.being_met_rows IS
  'PEOPLE. Per-gesture state against its promise. Service role only. Never used in snapshots or reports; only the triage page reads it.';
GRANT SELECT ON metrics.being_met_rows TO service_role;
