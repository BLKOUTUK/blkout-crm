-- 025_being_met_record.sql — Being met, phase 1: make the measure honest (Wed 30 Sep 2026)
-- Spec:  projects/membership/docs/being-met-spec-2026-09-30.md v1.0, sections 5.2, 5.3, 5.7, 7, 9
-- Table: projects/membership/docs/being-met-promise-table-DRAFT-2026-09-30.md v1.0
-- Applied via mcp__supabase__apply_migration as `being_met_record`.
--
-- ADDITIVE ONLY. New columns, new tables, new views, and a CREATE OR REPLACE of
-- metrics.being_met_live that keeps every existing column (same names, same order) and
-- appends two. No drops. The only data change is marking the four backfill batches.
--
-- What "met" means from here on (spec 5.2): met_at = the owed thing was delivered.
-- A row reads as KEPT only if it was delivered, arrived, and arrived by its promise's
-- deadline. Everything else that is due reads as MISSED, with a cause if one was recorded.
--
-- BACKFILL EVIDENCE (queried 30 Sep 2026, before this migration).
-- A live trigger writes one row at the moment of the gesture, so created_at ~= occurred_at
-- and rows are created one at a time. Four inserts wrote many rows in the same second,
-- every one of them days or weeks after the gesture it records:
--   compass_claims        created 2026-06-02 02:07:52  14 rows (6 live)  gestures 12-26 Apr
--   compass_claims        created 2026-07-06 14:14:38   6 rows (4 live)  gestures 11 Jun-5 Jul
--   event_interest        created 2026-08-11 15:54:53  57 rows (57 live) gestures 5 Jul-10 Aug
--   hub_outreach_2026_07  created 2026-08-11 15:56:48  22 rows (21 live) gestures 26 Jul, met_at = occurred_at
-- = 99 rows, 88 of them live. Every other row was created within 0 seconds of its gesture
-- (33 event_interest rows, 3 manual tests) or singly by the approval trigger (1 openings row,
-- created on approval the day after submission: a live capture, not a backfill).
-- These batches are named explicitly below, not inferred by a rule, so a future live row
-- can never be swept in.
--
-- ROLLBACK (run as one block; restores the pre-025 state exactly — data in the new columns is lost):
--   CREATE OR REPLACE VIEW metrics.being_met_live AS <the definition in 014_metrics_snapshots.sql>;
--     -- NB Postgres will not drop the two appended columns with CREATE OR REPLACE; instead:
--     -- DROP VIEW metrics.being_met_live; then re-run the 014 CREATE VIEW and its GRANT.
--   DROP VIEW IF EXISTS metrics.being_met_rows, metrics.being_met_kept, metrics.being_met_misses,
--                       metrics.being_met_coverage;
--   DROP TABLE IF EXISTS public.being_met_away, public.being_met_doors, public.being_met_config,
--                        public.promises;
--   DROP INDEX IF EXISTS public.first_gestures_source_ref_uniq;
--   ALTER TABLE public.first_gestures
--     DROP COLUMN IF EXISTS delivery_method, DROP COLUMN IF EXISTS delivery_outcome,
--     DROP COLUMN IF EXISTS delivery_evidence, DROP COLUMN IF EXISTS miss_cause,
--     DROP COLUMN IF EXISTS repaired_at, DROP COLUMN IF EXISTS backfilled,
--     DROP COLUMN IF EXISTS contact_confirmed_at, DROP COLUMN IF EXISTS source_ref;

------------------------------------------------------------------------------------------
-- 1. The record: first_gestures gains delivery, evidence, miss and backfill fields
------------------------------------------------------------------------------------------
ALTER TABLE public.first_gestures
  ADD COLUMN IF NOT EXISTS delivery_method text
    CHECK (delivery_method IN ('automatic', 'drafted', 'personal')),
  -- what the provider or the channel said happened to the send. NULL = nothing sent yet.
  ADD COLUMN IF NOT EXISTS delivery_outcome text
    CHECK (delivery_outcome IN ('delivered', 'bounced', 'skipped', 'failed')),
  -- the provider's own record (Resend id + status, SendFox campaign id, the DM read back)
  ADD COLUMN IF NOT EXISTS delivery_evidence jsonb,
  ADD COLUMN IF NOT EXISTS miss_cause text
    CHECK (miss_cause IN ('too_many_arrived', 'system_fault', 'missed_handoff',
                          'promise_unclear', 'wrong_recipient', 'not_reached_in_time')),
  ADD COLUMN IF NOT EXISTS repaired_at timestamptz,
  ADD COLUMN IF NOT EXISTS backfilled boolean NOT NULL DEFAULT false,
  -- for doors whose channel needs him to confirm first (SendFox double opt-in): when he did.
  -- NULL on such a door = unconfirmed, a separate report line, never BLKOUT's miss (principle 5).
  ADD COLUMN IF NOT EXISTS contact_confirmed_at timestamptz,
  -- an id from an outside system that is not a uuid (SendFox contact id, Heartbeat user id).
  -- source_id stays the uuid of a row in our own tables.
  ADD COLUMN IF NOT EXISTS source_ref text;

-- one row per outside-system record per door: a re-run of a sync can never duplicate
CREATE UNIQUE INDEX IF NOT EXISTS first_gestures_source_ref_uniq
  ON public.first_gestures (source_table, source_ref) WHERE source_ref IS NOT NULL;

COMMENT ON COLUMN public.first_gestures.met_at IS
  'From 30 Sep 2026 (being-met spec 5.2): the owed thing was delivered and arrived. Not "a human meeting happened". Rows marked backfilled carry the older meaning and are excluded from the kept rate.';
COMMENT ON COLUMN public.first_gestures.backfilled IS
  'Row was written after the fact by a batch, not captured at the gesture. Excluded from the kept rate and every timeliness measure. Set by 025 from the four named batches.';
COMMENT ON COLUMN public.first_gestures.miss_cause IS
  'Recorded, never deleted. A miss with no cause reads as "cause not recorded".';

-- Mark the four backfill batches (evidence in the header). Counts asserted before and after.
DO $$
DECLARE before_n int; marked int; after_n int;
BEGIN
  SELECT count(*) INTO before_n FROM public.first_gestures WHERE backfilled;
  IF before_n <> 0 THEN RAISE EXCEPTION 'expected 0 backfilled rows before 025, found %', before_n; END IF;

  UPDATE public.first_gestures SET backfilled = true
   WHERE (source_table, date_trunc('second', created_at)) IN (
           ('compass_claims',       timestamptz '2026-06-02 02:07:52+00'),
           ('compass_claims',       timestamptz '2026-07-06 14:14:38+00'),
           ('event_interest',       timestamptz '2026-08-11 15:54:53+00'),
           ('hub_outreach_2026_07', timestamptz '2026-08-11 15:56:48+00'));
  GET DIAGNOSTICS marked = ROW_COUNT;
  SELECT count(*) INTO after_n FROM public.first_gestures WHERE backfilled AND status IS NULL;
  IF marked <> 99 OR after_n <> 88 THEN
    RAISE EXCEPTION 'backfill marking: expected 99 rows (88 live), got % (% live)', marked, after_n;
  END IF;
END $$;

------------------------------------------------------------------------------------------
-- 2. The promise table as data (promise table v1.0, the six version 1 rows + Rule 39)
------------------------------------------------------------------------------------------
-- One row per gesture and audience. Windows are data, not code. A change is a new row;
-- the old row gets superseded_at and is kept (table rule 2). Nothing here is ratified:
-- status 'draft' until the board (about 24 Nov 2026) ratifies.
CREATE TABLE IF NOT EXISTS public.promises (
  key                   text PRIMARY KEY,
  row_no                text NOT NULL,             -- the promise table's own number
  audience              text NOT NULL CHECK (audience IN ('man', 'member', 'organisation')),
  gesture               text NOT NULL,
  surfaces              text[] NOT NULL DEFAULT '{}',   -- first_gestures.surface values this row governs
  owed                  text NOT NULL,
  channel               text NOT NULL,
  window_interval       interval,                  -- the measured deadline, from the gesture (or from confirmation)
  window_text           text NOT NULL,             -- the window as the promise states it
  surge_window_interval interval,                  -- longer window during a surge (person rows)
  window_from           text NOT NULL DEFAULT 'gesture' CHECK (window_from IN ('gesture', 'confirmation', 'before_meeting')),
  delivery_mode         text NOT NULL,             -- as the table states it, e.g. 'automatic, then personal'
  needs_person          boolean NOT NULL DEFAULT false,
  owner                 text NOT NULL,
  evidence              text NOT NULL,
  follow_on             text,
  not_promised          text NOT NULL,
  measured_per_person   boolean NOT NULL DEFAULT true,
  version               text NOT NULL,
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ratified')),
  valid_from            date NOT NULL,
  superseded_at         timestamptz,
  superseded_note       text,
  created_at            timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promises ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.promises FROM anon, authenticated;
COMMENT ON TABLE public.promises IS
  'Being met: one row per gesture and audience (promise table v1.0, 30 Sep 2026). Windows are data. Superseded rows are kept with superseded_at. Draft until the board ratifies.';

INSERT INTO public.promises
  (key, row_no, audience, gesture, surfaces, owed, channel, window_interval, window_text,
   surge_window_interval, window_from, delivery_mode, needs_person, owner, evidence, follow_on,
   not_promised, measured_per_person, version, valid_from)
VALUES
 ('r1_newsletter', '1', 'man', 'Signs up to the newsletter (blkoutuk.com/subscribe)', '{newsletter}',
  'An acknowledgment that he is signed up, and the newsletter', 'Email',
  interval '48 hours',
  'SendFox''s confirmation at once. BLKOUT''s follow-up 24 hours later. The newsletter on the next send. (Measured: the follow-up delivered within 48 hours of his confirmation — PROPOSED, the measured deadline is Claude''s reading of "24 hours later")',
  NULL, 'confirmation', 'automatic', false, 'Rob',
  'SendFox confirmed_at set and the send recorded',
  'An invitation to BLKOUTHUB for UK-based Black queer men, and other ways to engage for everyone',
  'A reply on a social inbox; anything beyond the standard because he liked or followed a post',
  true, 'v1.0', '2026-09-30'),
 ('r2_event', '2', 'man', 'Signs up to an event (picnic, other events)', '{events}',
  'The event information', 'Email', interval '48 hours',
  'Information at signup, then the briefing before the day (PROPOSED)',
  NULL, 'gesture', 'automatic, then manual briefings', false, 'Rob',
  'SendFox contact confirmed and campaign delivered',
  'After the event: a chance to give feedback and to sign up to the newsletter',
  'A place is not a promise of anything beyond the event information. The briefing part cannot be measured per person yet',
  true, 'v1.0', '2026-09-30'),
 ('r5_programme', '5', 'man', 'Applies to a programme (Making Ourselves From Scratch)', '{scratch}',
  'The information on how it works and what happens next', 'Email', interval '48 hours',
  'Automatic note at once. A person in touch within 48 hours (Scratch only; not carried into a membership opening)',
  interval '7 days', 'gesture', 'automatic, then personal', true, 'Rob',
  'Resend delivery for the note. The person''s reply logged against the row',
  'An invitation to the BLKOUT Hub, and the newsletter sign-up',
  'A place on the programme because he applied (eight places)',
  true, 'v1.0', '2026-09-30'),
 ('r8_compass', '8', 'man', 'Claims an Ivor''s Compass card', '{compass}',
  'What the claim promised (the code or journal access)', 'Email', interval '48 hours',
  'Within 48 hours (current setting)', NULL, 'gesture', 'automatic', false, 'Rob',
  'Delivery record',
  'The newsletter and, for those who qualify, the BLKOUT Hub',
  'Anything beyond what the claim form promised',
  true, 'v1.0', '2026-09-30'),
 ('r10_social_inbox', '10', 'man', 'Messages our Instagram or Facebook inbox', '{}',
  'An honest holding note that says we check this inbox now and then, and gives an email address',
  'The platform inbox', NULL,
  'At once (the holding note). The note does not state a reply time; the account bio does',
  NULL, 'gesture', 'automatic', false, 'Rob',
  'The automatic reply is switched on and tested',
  NULL, 'A reply on the channel he used, or a reply sooner than the stated window',
  false, 'v1.0', '2026-09-30'),
 ('r15_rights', '15', 'man', 'Asks what BLKOUT holds about him, asks for erasure, withdraws consent, or complains', '{rights}',
  'A reply from a person, and the action taken', 'Email', interval '1 month',
  'Within one month (the statutory window; PROPOSED)', NULL, 'gesture', 'personal', true, 'Rob',
  'The reply sent with delivery confirmed, and the action recorded. Erasure is by anonymising, so the record of what was promised survives',
  NULL, 'Anything beyond the reply and the action he asked for',
  true, 'v1.0', '2026-09-30'),
 ('m39_notice', 'M39', 'member', 'A general meeting is called (CBS Rules, Rule 39)', '{}',
  '14 clear days'' notice to every member, naming all the business; no business transacted that the notice did not name',
  'Email', interval '14 days', '14 clear days before the meeting', NULL, 'before_meeting', 'automatic', false, 'Rob',
  'The notice sent to each member, with its date, against the meeting date',
  NULL, 'Business not named in the notice',
  false, 'v1.0', '2026-09-30')
ON CONFLICT (key) DO NOTHING;

------------------------------------------------------------------------------------------
-- 3. Doors known (spec 5.1), away entries, and the small config the later phases read
------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.being_met_doors (
  key              text PRIMARY KEY,
  label            text NOT NULL,
  surface          text,                 -- first_gestures.surface once wired
  wired_since      date,                 -- NULL = not counted. The coverage view counts this.
  wired_note       text,
  unmeasured_count integer,              -- contacts this door had that never reached the record, where countable
  unmeasured_as_at timestamptz,
  unmeasured_source text,
  sort             integer NOT NULL
);
ALTER TABLE public.being_met_doors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.being_met_doors FROM anon, authenticated;
COMMENT ON TABLE public.being_met_doors IS
  'Every door known (spec 5.1, 12 on 30 Sep 2026). A door counts only when wired_since is set. The measure never looks complete when it is not.';

INSERT INTO public.being_met_doors (key, label, surface, wired_since, wired_note, sort) VALUES
 ('programme_application', 'Programme application (blkoutuk.com/scratch)', 'scratch', '2026-09-30', 'Own surface (event_interest slug scratch-2026). Email to Rob per application is live. wired_since = the spec date; the trigger''s own start date was not established', 1),
 ('event_signup',          'Event signup (event_interest)',                  'events',  '2026-08-11', 'Wired. The picnic slug skips the acknowledgment; signups older than 7 days skip it', 2),
 ('compass_claim',         'Compass card claim',                              'compass', '2026-08-11', 'Wired (trigger). No live-captured row yet: all 20 compass rows are backfill batches', 3),
 ('opening_submission',    'Submitting an opening to the events surface',     'openings','2026-09-03', 'Wired on approval only: declined or waiting submissions are not in the record', 4),
 ('newsletter_signup',     'Newsletter signup (blkoutuk.com/subscribe)',      'newsletter', NULL, 'Not wired: SendFox hosted page. Phase 2 sync sets wired_since when switched on', 5),
 ('event_rsvp',            'Formal event RSVP (event_rsvps)',                 NULL, NULL, 'Trigger writes only a log row. 0 rows', 6),
 ('event_attendance',      'Attending an event',                              NULL, NULL, 'Not recorded. Check-in code or QR, after version 1', 7),
 ('hub_join',              'Hub join (Heartbeat)',                            'hub', NULL, 'Not wired. Phase 2 prepares the USER_JOIN webhook; registration is Rob''s nod', 8),
 ('social_comments',       'Instagram and Facebook comments',                 NULL, NULL, 'Not captured. After version 1', 9),
 ('social_messages',       'Instagram and Facebook messages',                 NULL, NULL, 'Holding message drafted, not switched on', 10),
 ('channel_email',         'Email to a channel address',                      NULL, NULL, 'Addresses not created', 11),
 ('partnership_enquiry',   'Partnership enquiry',                             NULL, NULL, 'No standard exists', 12)
ON CONFLICT (key) DO NOTHING;
-- wired_since dates: scratch = the spec date (start not established); events/compass = the
-- first_gestures triggers going live (first live-captured row and manual tests 11 Aug);
-- openings = the first row created by the approval trigger (submission 3 Sep).
-- NOT in spec 5.1 and so not seeded: surface 'liberation-tech' (policy_responses trigger, 0 rows
-- on 30 Sep). Flagged to Rob: a 13th door, or retire the trigger.

CREATE TABLE IF NOT EXISTS public.being_met_away (
  id         bigserial PRIMARY KEY,
  starts_on  date NOT NULL,
  ends_on    date NOT NULL CHECK (ends_on >= starts_on),
  written_by text NOT NULL DEFAULT 'Rob',
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.being_met_away ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.being_met_away FROM anon, authenticated;
COMMENT ON TABLE public.being_met_away IS
  'Away is a dated entry written before he is away (spec 6), never a setting. Weeks away are reported.';

CREATE TABLE IF NOT EXISTS public.being_met_config (
  id                        integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  weekly_drafted_capacity   integer NOT NULL DEFAULT 10,
  weekly_personal_capacity  integer NOT NULL DEFAULT 4,
  updated_at                timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.being_met_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.being_met_config FROM anon, authenticated;
INSERT INTO public.being_met_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
COMMENT ON TABLE public.being_met_config IS
  'Being met settings. Capacity figures are Claude''s assumptions (spec 6), for Rob to correct; the record measures the real ones.';

------------------------------------------------------------------------------------------
-- 4. The views
------------------------------------------------------------------------------------------
-- 4a. PEOPLE. One row per gesture with its state. Lists person_ref and person_name.
--     Service role only (metrics is not in PostgREST). NEVER read by a snapshot or report;
--     only the triage page Rob opens reads it.
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
       -- in_measure: counts toward the kept rate
       (status IS NULL AND NOT backfilled AND promise_key IS NOT NULL) AS in_measure,
       -- the state of the row against its promise. Computed for every row (tests included)
       -- so a check can read a test row; the aggregate views use in_measure.
       CASE
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
         WHEN miss_cause IS NOT NULL THEN miss_cause
         WHEN delivery_outcome IN ('bounced', 'skipped', 'failed') THEN 'cause not recorded (send ' || delivery_outcome || ')'
         WHEN met_at IS NOT NULL AND met_at > due_at THEN 'cause not recorded (arrived late)'
         WHEN met_at IS NULL AND now() > due_at THEN 'cause not recorded (nothing arrived)'
       END AS miss_reason
FROM r;
COMMENT ON VIEW metrics.being_met_rows IS
  'PEOPLE. Per-gesture state against its promise. Service role only. Never used in snapshots or reports; only the triage page reads it.';

-- 4b. Kept rate per promise row and month. Counts only.
CREATE OR REPLACE VIEW metrics.being_met_kept AS
SELECT promise_row,
       promise_key,
       to_char(date_trunc('month', occurred_at), 'YYYY-MM')            AS period,
       count(*) FILTER (WHERE in_measure)                              AS in_measure,
       count(*) FILTER (WHERE in_measure AND state = 'kept')           AS kept,
       count(*) FILTER (WHERE in_measure AND state = 'missed')         AS missed,
       count(*) FILTER (WHERE in_measure AND state = 'pending')        AS pending,
       count(*) FILTER (WHERE in_measure AND state = 'unconfirmed')    AS unconfirmed,
       count(*) FILTER (WHERE in_measure AND state = 'missed' AND before_promise_written)
                                                                       AS missed_before_promise_written,
       count(*) FILTER (WHERE status IS NULL AND backfilled)           AS excluded_backfilled,
       round(100.0 * count(*) FILTER (WHERE in_measure AND state = 'kept')
             / nullif(count(*) FILTER (WHERE in_measure AND state IN ('kept', 'missed')), 0), 1)
                                                                       AS kept_rate_pct   -- NULL = nothing due yet, never 0
FROM metrics.being_met_rows
WHERE promise_key IS NOT NULL
GROUP BY promise_row, promise_key, date_trunc('month', occurred_at);
COMMENT ON VIEW metrics.being_met_kept IS
  'Counts only. Kept rate excludes backfilled rows, tests and non-live statuses. Unconfirmed is its own line (principle 5). kept_rate_pct NULL = nothing due.';

-- 4c. Misses by promise row and cause, with the unrepaired count. Counts only.
CREATE OR REPLACE VIEW metrics.being_met_misses AS
SELECT promise_row,
       coalesce(miss_cause, 'cause not recorded')   AS cause,
       count(*)                                     AS missed,
       count(*) FILTER (WHERE repaired_at IS NULL)  AS unrepaired,
       count(*) FILTER (WHERE before_promise_written) AS before_promise_written,
       min(occurred_at)                             AS earliest,
       max(occurred_at)                             AS latest
FROM metrics.being_met_rows
WHERE in_measure AND state = 'missed'
GROUP BY promise_row, coalesce(miss_cause, 'cause not recorded');
COMMENT ON VIEW metrics.being_met_misses IS
  'Counts only: misses per promise row and cause, and how many are unrepaired. Names are on the triage page, never here.';

-- 4d. Coverage, which every report leads with (spec 5.7).
CREATE OR REPLACE VIEW metrics.being_met_coverage AS
WITH wk AS (
  SELECT generate_series(date_trunc('week', now()) - interval '12 weeks', date_trunc('week', now()), interval '1 week') AS week_start
), person_arrivals AS (
  SELECT date_trunc('week', r.occurred_at) AS week_start,
         count(*) FILTER (WHERE p.delivery_mode ILIKE '%drafted%')  AS drafted,
         count(*) FILTER (WHERE p.delivery_mode ILIKE '%personal%') AS personal
  FROM metrics.being_met_rows r JOIN public.promises p ON p.key = r.promise_key
  WHERE r.status IS NULL AND NOT r.backfilled AND p.needs_person
  GROUP BY 1
), cfg AS (SELECT * FROM public.being_met_config WHERE id = 1)
SELECT (SELECT count(*) FROM public.being_met_doors)                              AS doors_known,
       (SELECT count(*) FROM public.being_met_doors WHERE wired_since IS NOT NULL) AS doors_counted,
       (SELECT string_agg(label, '; ' ORDER BY sort) FROM public.being_met_doors WHERE wired_since IS NOT NULL) AS doors_counted_list,
       (SELECT string_agg(label, '; ' ORDER BY sort) FROM public.being_met_doors WHERE wired_since IS NULL)     AS doors_not_counted_list,
       (SELECT jsonb_object_agg(key, jsonb_build_object('count', unmeasured_count, 'as_at', unmeasured_as_at, 'source', unmeasured_source))
          FROM public.being_met_doors WHERE unmeasured_count IS NOT NULL)          AS unmeasured_by_door,
       (SELECT count(*) FROM wk WHERE EXISTS (
          SELECT 1 FROM public.being_met_away a
           WHERE a.starts_on < wk.week_start + interval '7 days' AND a.ends_on >= wk.week_start)) AS weeks_away_13w,
       (SELECT count(*) FROM wk JOIN person_arrivals pa USING (week_start), cfg
         WHERE pa.drafted > cfg.weekly_drafted_capacity OR pa.personal > cfg.weekly_personal_capacity) AS weeks_in_surge_13w,
       (SELECT count(*) FROM metrics.being_met_rows WHERE status IS NULL AND backfilled) AS live_rows_backfilled_excluded,
       (SELECT count(*) FROM metrics.being_met_rows WHERE status IS NULL AND NOT backfilled AND promise_key IS NULL) AS live_rows_without_v1_promise,
       now() AS as_at;
COMMENT ON VIEW metrics.being_met_coverage IS
  'Every being-met report leads with this: doors counted out of doors known, unmeasured counts, weeks away and in surge (last 13 weeks).';

-- 4e. metrics.being_met_live — same columns, same order, honest definitions; two appended.
--     met / met_in_window / acknowledged / landed now count LIVE rows only (status IS NULL),
--     so met + unmet = live (31 + 91 = 122 on 30 Sep 2026). met_in_window and the median
--     also exclude backfilled rows, which were never measured. gestures_total and
--     gestures_30d keep their old meaning (every row), as labelled.
CREATE OR REPLACE VIEW metrics.being_met_live AS
SELECT
  count(*)::int                                                                 AS gestures_total,
  count(*) FILTER (WHERE occurred_at > now() - interval '30 days')::int         AS gestures_30d,
  count(*) FILTER (WHERE status IS NULL AND acknowledged_at IS NOT NULL)::int   AS acknowledged,
  count(*) FILTER (WHERE status IS NULL AND met_at IS NOT NULL)::int            AS met,
  count(*) FILTER (WHERE status IS NULL AND NOT backfilled AND met_at IS NOT NULL
                   AND met_at <= occurred_at + interval '48 hours')::int        AS met_in_window,
  count(*) FILTER (WHERE met_at IS NULL AND status IS NULL)::int                AS unmet,
  count(*) FILTER (WHERE met_at IS NULL AND status IS NULL
                   AND occurred_at < now() - interval '48 hours')::int          AS unmet_over_window,
  round((percentile_cont(0.5) WITHIN GROUP (
    ORDER BY extract(epoch FROM met_at - occurred_at) / 3600.0
  ) FILTER (WHERE status IS NULL AND NOT backfilled AND met_at IS NOT NULL
            AND occurred_at > now() - interval '90 days'))::numeric, 1)         AS median_hours_to_met_90d,
  count(*) FILTER (WHERE status IS NULL AND landed_at IS NOT NULL)::int         AS landed,
  count(*) FILTER (WHERE status IS NULL)::int                                   AS live,
  count(*) FILTER (WHERE status IS NULL AND backfilled)::int                    AS live_backfilled
FROM public.first_gestures;

GRANT SELECT ON ALL TABLES IN SCHEMA metrics TO service_role;
