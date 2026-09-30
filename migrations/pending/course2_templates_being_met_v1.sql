-- PENDING — NOT APPLIED. Apply only after Rob approves the copy in
-- projects/membership/docs/being-met-outbound-copy-DRAFT-2026-09-30.md (rows 2, 5, 8 and 15).
-- When approved: copy any wording changes in here, give it the next migration number,
-- apply via mcp__supabase__apply_migration, then deploy acknowledge-gesture v6 (below).
--
-- What it does:
--   1. course2_config.templates gains `by_surface`: one note per door, so each says only what
--      that door promises. The live first_contact/returner templates stay as the fallback for
--      any other surface (openings), untouched.
--   2. excluded_surfaces gains 'rights' (a hand-recorded rights request must not get a receipt).
--
-- acknowledge-gesture v6 is v5 with one line changed:
--   v5: const t = cfg.templates[kind];
--   v6: const t = cfg.templates.by_surface?.[rec.surface]?.[kind] ?? cfg.templates[kind];
--
-- ROLLBACK:
--   UPDATE public.course2_config SET templates = templates - 'by_surface',
--     excluded_surfaces = array_remove(excluded_surfaces, 'rights'), updated_at = now() WHERE id = 1;

UPDATE public.course2_config
SET templates = templates || jsonb_build_object('by_surface', jsonb_build_object(
      'events', jsonb_build_object(
        'first_contact', jsonb_build_object('subject', $s$You're signed up$s$, 'body', $b${name}, thanks for signing up. This is an automatic note so you know it arrived.

We'll send you the practical details you need before the day. You can see everything else that's on here: https://events.blkoutuk.com

If this wasn't you, reply and we'll remove your address.

BLKOUT

BLKOUT is not a crisis service. For urgent help: Samaritans 116 123 (free), NHS 111, or 999.$b$),
        'returner', jsonb_build_object('subject', $s$You're signed up$s$, 'body', $b${name}, good to have you back. This is an automatic note so you know it arrived.

We'll send you the practical details you need before the day. You can see everything else that's on here: https://events.blkoutuk.com

If this wasn't you, reply and we'll remove your address.

BLKOUT

BLKOUT is not a crisis service. For urgent help: Samaritans 116 123 (free), NHS 111, or 999.$b$)),
      'scratch', jsonb_build_object(
        'first_contact', jsonb_build_object('subject', $s$We've got your application: Making Ourselves From Scratch$s$, 'body', $b${name}, thanks for applying. This is an automatic note so you know your application arrived.

A person from BLKOUT will be in touch within 48 hours. Places are limited and we confirm them after applications close, so applying isn't the same as having a place.

The full briefing, the dates and what happens next: https://blkoutuk.com/scratch

If this wasn't you, reply and we'll remove your address.

BLKOUT

BLKOUT is not a crisis service. For urgent help: Samaritans 116 123 (free), NHS 111, or 999.$b$),
        'returner', jsonb_build_object('subject', $s$We've got your application: Making Ourselves From Scratch$s$, 'body', $b${name}, good to have you back. This is an automatic note so you know your application arrived.

A person from BLKOUT will be in touch within 48 hours. Places are limited and we confirm them after applications close, so applying isn't the same as having a place.

The full briefing, the dates and what happens next: https://blkoutuk.com/scratch

If this wasn't you, reply and we'll remove your address.

BLKOUT

BLKOUT is not a crisis service. For urgent help: Samaritans 116 123 (free), NHS 111, or 999.$b$)),
      'compass', jsonb_build_object(
        'first_contact', jsonb_build_object('subject', $s$Your Ivor's Compass card$s$, 'body', $b${name}, thanks for claiming your Ivor's Compass card. This is an automatic note so you know it arrived.

[ROB TO CONFIRM: what the card gives him, in the claim form's words.] Ivor's story and the journal are here: https://compass.blkoutuk.com

If this wasn't you, reply and we'll remove your address.

BLKOUT

BLKOUT is not a crisis service. For urgent help: Samaritans 116 123 (free), NHS 111, or 999.$b$),
        'returner', jsonb_build_object('subject', $s$Your Ivor's Compass card$s$, 'body', $b${name}, good to have you back. This is an automatic note so you know it arrived.

[ROB TO CONFIRM: what the card gives him, in the claim form's words.] Ivor's story and the journal are here: https://compass.blkoutuk.com

If this wasn't you, reply and we'll remove your address.

BLKOUT

BLKOUT is not a crisis service. For urgent help: Samaritans 116 123 (free), NHS 111, or 999.$b$))
    )),
    excluded_surfaces = CASE WHEN 'rights' = ANY (excluded_surfaces) THEN excluded_surfaces
                             ELSE array_append(excluded_surfaces, 'rights') END,
    updated_at = now()
WHERE id = 1;

-- Refuse to leave a placeholder in a live template.
DO $$ BEGIN
  IF (SELECT templates::text FROM public.course2_config WHERE id = 1) LIKE '%ROB TO CONFIRM%' THEN
    RAISE EXCEPTION 'a template still carries a ROB TO CONFIRM placeholder; fill it before applying';
  END IF;
END $$;
