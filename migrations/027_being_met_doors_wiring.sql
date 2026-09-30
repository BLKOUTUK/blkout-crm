-- 027_being_met_doors_wiring.sql — Being met, phase 2: wire the version 1 doors (Wed 30 Sep 2026)
-- Applied via mcp__supabase__apply_migration as `being_met_doors_wiring`.
-- Brief: projects/membership/docs/being-met-build-brief-2026-09-30.md, phase 2.
--
-- 1. course2_config.excluded_surfaces: the acknowledgment (acknowledge-gesture v5) sends no
--    receipt for these surfaces. Newsletter and hub keep their promises through their own
--    framework; without this, every synced newsletter signup would get the generic receipt
--    (shown on 30 Sep: a newsletter test row under v4 got "auto-receipt sent (first_contact)").
-- 2. being_met_config: the switches for the two new doors. BOTH OFF. Off means: test
--    addresses (rob@ / rob+…@blkoutuk.com) are still recorded, with status 'test', so the door
--    can be proved; nobody else is recorded, and the newsletter door's unmeasured count is kept.
-- 3. being_met_doors: last sync time and status, so a failed sync shows on the triage page.
-- 4. public.being_met_record_external(...): the one idempotent writer for outside-system rows
--    (SendFox contact id, Heartbeat user id). A re-run never duplicates; a later confirmation
--    or bounce updates the row once.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.being_met_record_external(text, text, text, text, text, text, timestamptz, text, timestamptz, text, jsonb);
--   ALTER TABLE public.being_met_doors DROP COLUMN IF EXISTS last_sync_at, DROP COLUMN IF EXISTS last_sync_status;
--   ALTER TABLE public.being_met_config DROP COLUMN IF EXISTS newsletter_sync_enabled,
--     DROP COLUMN IF EXISTS newsletter_form_id, DROP COLUMN IF EXISTS newsletter_sync_since,
--     DROP COLUMN IF EXISTS hub_join_enabled;
--   ALTER TABLE public.course2_config DROP COLUMN IF EXISTS excluded_surfaces;
--   (and redeploy acknowledge-gesture from index.v4.ts.bak; v5 without the column still excludes
--    newsletter and hub by its own default)

ALTER TABLE public.course2_config
  ADD COLUMN IF NOT EXISTS excluded_surfaces text[] NOT NULL DEFAULT '{newsletter,hub}';

ALTER TABLE public.being_met_config
  ADD COLUMN IF NOT EXISTS newsletter_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_form_id integer NOT NULL DEFAULT 232233,
  ADD COLUMN IF NOT EXISTS newsletter_sync_since timestamptz NOT NULL DEFAULT '2026-09-30 00:00+00',
  ADD COLUMN IF NOT EXISTS hub_join_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.being_met_doors
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_status text;   -- 'ok …' or 'FAILED: …'. Never blank after a run.

CREATE OR REPLACE FUNCTION public.being_met_record_external(
  p_surface text, p_source_table text, p_source_ref text, p_person_ref text, p_person_name text,
  p_gesture text, p_occurred_at timestamptz, p_status text, p_confirmed_at timestamptz,
  p_delivery_outcome text, p_delivery_evidence jsonb)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_inserted boolean;
BEGIN
  IF p_source_ref IS NULL OR p_source_table IS NULL THEN
    RAISE EXCEPTION 'being_met_record_external: source_table and source_ref are required';
  END IF;
  INSERT INTO public.first_gestures
    (person_ref, person_name, surface, gesture, source_table, source_ref, occurred_at, status,
     contact_confirmed_at, delivery_outcome, delivery_evidence)
  VALUES (lower(trim(p_person_ref)), nullif(trim(p_person_name), ''), p_surface, p_gesture,
          p_source_table, p_source_ref, p_occurred_at, p_status, p_confirmed_at,
          p_delivery_outcome, p_delivery_evidence)
  ON CONFLICT (source_table, source_ref) WHERE source_ref IS NOT NULL DO UPDATE
     SET contact_confirmed_at = coalesce(first_gestures.contact_confirmed_at, excluded.contact_confirmed_at),
         delivery_outcome     = coalesce(first_gestures.delivery_outcome, excluded.delivery_outcome),
         delivery_evidence    = coalesce(first_gestures.delivery_evidence, excluded.delivery_evidence)
  RETURNING id, (xmax = 0) INTO v_id, v_inserted;
  RETURN CASE WHEN v_inserted THEN 'inserted' ELSE 'updated' END;
END $$;
REVOKE ALL ON FUNCTION public.being_met_record_external(text, text, text, text, text, text, timestamptz, text, timestamptz, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.being_met_record_external(text, text, text, text, text, text, timestamptz, text, timestamptz, text, jsonb) TO service_role;
