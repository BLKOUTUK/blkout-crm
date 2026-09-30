-- 030_being_met_urgent_flag.sql — Being met, phase 4: the triage page's urgent marker (Wed 30 Sep 2026)
-- Applied via mcp__supabase__apply_migration as `being_met_urgent_flag`.
--
-- Spec 5.6: the triage page lists first "anything urgent, or where someone may be in distress".
-- Software does not detect distress (spec 5.5, 11). urgent_at is set by a person (Rob, at
-- triage or on reading a message), or later by the AIvor route's "urgent" answer (spec 5.9,
-- deferred). A flagged row sorts to the top of the page until it is met or repaired.
--
-- ROLLBACK:
--   ALTER TABLE public.first_gestures DROP COLUMN IF EXISTS urgent_at, DROP COLUMN IF EXISTS urgent_note;

ALTER TABLE public.first_gestures
  ADD COLUMN IF NOT EXISTS urgent_at timestamptz,
  ADD COLUMN IF NOT EXISTS urgent_note text;

COMMENT ON COLUMN public.first_gestures.urgent_at IS
  'Set by a person when a gesture may need urgent attention (possible distress). Top of the triage page until met or repaired. Never set by software guessing.';
