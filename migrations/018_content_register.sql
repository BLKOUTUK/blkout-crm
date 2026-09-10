-- 018_content_register.sql — one register, not five (Thu 10 Sep 2026)
-- Brief: apps/comms-blkout/docs/content-one-register-brief-2026-09-10.md (Opus, section A
-- and the insert path of section D). Applied via mcp__supabase__apply_migration as
-- `content_register` on 10 Sep 2026.
--
-- Purpose: `public.content_calendar` becomes the ONE place BLKOUT's scheduled content
-- lives. Until today the /admin calendar page read four campaign JSON files compiled into
-- the browser bundle, `/campaign` and `/post` read those same files off disk (plus a
-- fifth the commands expected and nobody had put there), and this table held four rows
-- nothing looked at. The files are imported into this table and deleted; the page and the
-- two commands read the table.
--
-- Every read and write from the app goes through comms-blkout's own server on the service
-- role (GET/POST /api/admin/content, behind a session bearer). The RLS policies on this
-- table were read before this migration was written and are deliberately left alone:
--   "Content is readable by editors"                  r  is_editor_or_admin() AND deleted_at IS NULL
--   "Editors can create content"                      a  with_check is_editor_or_admin()
--   "Creators can update their content, admins all"   w  (is_editor_or_admin() AND is_content_creator(created_by)) OR is_admin()
--   "Creators can soft-delete …, admins can delete all" w  same qual
-- is_editor_or_admin() reads auth.users.raw_user_meta_data->>'role' IN
-- ('admin','editor','content_lead'). The project has exactly one auth user and it carries
-- such a role, so an admin session WOULD satisfy them — but nothing in this build depends
-- on that, because the browser never touches the table directly.
--
-- THREE THINGS THE BRIEF DID NOT KNOW, all of which had to be settled here:
--
--  1. A status CHECK already existed. `content_status_check` allowed
--     draft/review/approved/scheduled/published/failed/cancelled. The four live rows used
--     `approved` (×3) and `published` (×1). Both are one-word renames into the new
--     vocabulary, so they are mapped — approved → ready, published → posted — and the old
--     constraint is replaced. Nothing else in any repo reads this table (checked: the
--     only `content_calendar` hits across apps/ are ivor-core's unrelated
--     `social_content_calendar` and a `content_calendar_id` column on content_performance),
--     so no caller is left holding a retired word.
--
--  2. `content_type` has its own CHECK (post/thread/carousel/video/story/reel/article) and
--     it is KEPT. The importer maps each file's looser type into that vocabulary and
--     preserves the original under metadata.legacy.
--
--  3. `platform_id` was NOT NULL with a RESTRICT foreign key to public.platforms, which
--     holds exactly six rows (instagram, twitter, linkedin, facebook, tiktok, youtube).
--     The register's channel model is `metadata.channels` — a post goes to several places
--     at once, and some rows are a newsletter or a web piece with no platform row at all.
--     A required single platform cannot express that, so the column is made nullable. It
--     is still populated with the first channel that resolves, for anything that reads it.

-- ── 1. status vocabulary ────────────────────────────────────────────────────────────
-- draft · ready · scheduled · posted · skipped. Five words, each one a thing a human
-- does: not written yet, written and cleared, queued, out, dropped.
-- Order matters: the OLD constraint (draft/review/approved/scheduled/published/failed/
-- cancelled) rejects both new words, so it comes off before the rows are mapped, and the
-- new one goes on after. Dropping first was not an oversight avoided — the first attempt
-- at this migration mapped before dropping and failed on 'ready'.
ALTER TABLE public.content_calendar DROP CONSTRAINT IF EXISTS content_status_check;

UPDATE public.content_calendar SET status = 'ready'  WHERE status = 'approved';
UPDATE public.content_calendar SET status = 'posted' WHERE status = 'published';

ALTER TABLE public.content_calendar
  ADD CONSTRAINT content_status_check
  CHECK (status IN ('draft', 'ready', 'scheduled', 'posted', 'skipped'));

-- ── 2. shape ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.content_calendar ALTER COLUMN platform_id DROP NOT NULL;
ALTER TABLE public.content_calendar ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
UPDATE public.content_calendar SET metadata = '{}'::jsonb WHERE metadata IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_calendar_scheduled_for
  ON public.content_calendar (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_calendar_status
  ON public.content_calendar (status);
-- The importer is idempotent on metadata->>'source'; without this it is a seq scan per row.
CREATE INDEX IF NOT EXISTS idx_content_calendar_source
  ON public.content_calendar ((metadata->>'source'));

COMMENT ON TABLE public.content_calendar IS
  'The content register. One row per thing that goes out. status: draft/ready/scheduled/posted/skipped. metadata carries campaign (slug), channels (array), source (file:<name>#<id> | agent:<task id> | manual), posted ({channel:{id,url,at}}), legacy (whatever the import could not model). Read and written through comms-blkout GET/POST /api/admin/content and the /campaign and /post commands. Migration 018, 10 Sep 2026.';

-- ── 3. the read ─────────────────────────────────────────────────────────────────────
-- One call for the Content page. Rows scheduled inside the window, PLUS everything still
-- draft or ready whatever its date — an unscheduled draft that fell out of the window is
-- exactly the row a person needs to see, and a date filter would hide it.
CREATE OR REPLACE FUNCTION public.admin_content_list(p_from date, p_to date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH visible AS (
    SELECT c.*
    FROM public.content_calendar c
    WHERE c.deleted_at IS NULL
      AND (
        (c.scheduled_for >= p_from::timestamptz
         AND c.scheduled_for < (p_to + 1)::timestamptz)
        OR c.status IN ('draft', 'ready')
        OR (c.status = 'posted' AND c.published_at >= (now() - interval '30 days'))
      )
  )
  SELECT jsonb_build_object(
    'rows', (
      SELECT coalesce(jsonb_agg(
               jsonb_build_object(
                 'id',                 v.id,
                 'title',              v.title,
                 'content_type',       v.content_type,
                 'status',             v.status,
                 'scheduled_for',      v.scheduled_for,
                 'published_at',       v.published_at,
                 'primary_content',    v.primary_content,
                 'hashtags',           to_jsonb(coalesce(v.hashtags, ARRAY[]::text[])),
                 'media_urls',         to_jsonb(coalesce(v.media_urls, ARRAY[]::text[])),
                 'generated_by_agent', v.generated_by_agent,
                 'internal_notes',     v.internal_notes,
                 'metadata',           coalesce(v.metadata, '{}'::jsonb),
                 'updated_at',         v.updated_at
               ) ORDER BY v.scheduled_for ASC NULLS LAST, v.title ASC), '[]'::jsonb)
      FROM visible v),

    -- Counts over the same visible set, so the strip and the lists can never disagree.
    'counts', (
      SELECT coalesce(jsonb_object_agg(t.status, t.n), '{}'::jsonb)
      FROM (SELECT v.status, count(*)::int AS n FROM visible v GROUP BY v.status) t),

    -- Every campaign slug the register knows, for the new-item form's datalist. Read from
    -- the whole table, not the window: a person adding an item to a campaign that has
    -- nothing scheduled this month still needs its name to autocomplete, and a list that
    -- silently shrinks with the window would teach them the campaign no longer exists.
    'campaigns', (
      SELECT coalesce(jsonb_agg(DISTINCT c.metadata->>'campaign'), '[]'::jsonb)
      FROM public.content_calendar c
      WHERE c.deleted_at IS NULL AND nullif(c.metadata->>'campaign', '') IS NOT NULL),

    'window', jsonb_build_object('from', p_from, 'to', p_to),
    'generated_at', now()
  )
$$;

ALTER FUNCTION public.admin_content_list(date, date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_content_list(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_content_list(date, date) TO service_role;

-- ── 4. the status write ─────────────────────────────────────────────────────────────
-- The only way a status changes. It validates the word, stamps published_at the first
-- time a row goes out (never re-stamps — a re-post is not a first post), and appends to
-- metadata.status_log so the page's chips have a history behind them rather than a
-- current value with no provenance. A bad id or a bad word raises; the caller answers
-- 502 rather than returning a row that did not change.
CREATE OR REPLACE FUNCTION public.admin_content_set_status(p_id uuid, p_status text, p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_from text;
  v_row  public.content_calendar;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('draft', 'ready', 'scheduled', 'posted', 'skipped') THEN
    RAISE EXCEPTION 'unknown status %; the register uses draft, ready, scheduled, posted, skipped', p_status;
  END IF;

  SELECT status INTO v_from
  FROM public.content_calendar
  WHERE id = p_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no live register row %', p_id;
  END IF;

  UPDATE public.content_calendar SET
    status       = p_status,
    published_at = CASE WHEN p_status = 'posted' AND published_at IS NULL
                        THEN now() ELSE published_at END,
    metadata     = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
                     'status_log',
                     coalesce(metadata->'status_log', '[]'::jsonb) || jsonb_build_array(
                       jsonb_build_object('at', now(), 'from', v_from, 'to', p_status,
                                          'by', coalesce(p_actor, 'unknown')))),
    updated_at   = now()
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

ALTER FUNCTION public.admin_content_set_status(uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_content_set_status(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_content_set_status(uuid, text, text) TO service_role;

-- ── 5. the insert ───────────────────────────────────────────────────────────────────
-- Section D: approving an agent draft has to land somewhere. Before today, approve wrote
-- approval_status on socialsync_agent_tasks and stopped — 74 tasks had been approved or
-- were waiting and not one of them became a thing that could be posted. Now approve
-- inserts here.
--
-- Whitelisted fields only, so a caller cannot set created_at, deleted_at, or an id.
-- `channels` decides platform_id: the first channel that names a real platforms row.
-- Idempotent on metadata->>'source' — approving the same task twice returns the row that
-- already exists rather than a duplicate, and says which happened.
CREATE OR REPLACE FUNCTION public.admin_content_insert(p_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source   text := nullif(p_row->'metadata'->>'source', '');
  v_status   text := coalesce(nullif(p_row->>'status', ''), 'draft');
  v_type     text := coalesce(nullif(p_row->>'content_type', ''), 'post');
  v_title    text := nullif(btrim(coalesce(p_row->>'title', '')), '');
  v_channels jsonb := coalesce(p_row->'metadata'->'channels', '[]'::jsonb);
  v_platform uuid;
  v_row      public.content_calendar;
  v_existing public.content_calendar;
BEGIN
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'a register row needs a title';
  END IF;
  IF v_status NOT IN ('draft', 'ready', 'scheduled', 'posted', 'skipped') THEN
    RAISE EXCEPTION 'unknown status %', v_status;
  END IF;
  IF v_type NOT IN ('post', 'thread', 'carousel', 'video', 'story', 'reel', 'article') THEN
    RAISE EXCEPTION 'unknown content_type %', v_type;
  END IF;

  IF v_source IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.content_calendar
    WHERE metadata->>'source' = v_source AND deleted_at IS NULL
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('created', false, 'row', to_jsonb(v_existing));
    END IF;
  END IF;

  SELECT p.id INTO v_platform
  FROM jsonb_array_elements_text(v_channels) WITH ORDINALITY AS ch(slug, ord)
  JOIN public.platforms p ON p.slug = ch.slug
  ORDER BY ch.ord
  LIMIT 1;

  INSERT INTO public.content_calendar (
    title, content_type, status, platform_id, scheduled_for,
    primary_content, hashtags, media_urls,
    generated_by_agent, generation_prompt, internal_notes, priority, metadata
  ) VALUES (
    v_title,
    v_type,
    v_status,
    v_platform,
    nullif(p_row->>'scheduled_for', '')::timestamptz,
    p_row->>'primary_content',
    coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p_row->'hashtags',   '[]'::jsonb)) x), ARRAY[]::text[]),
    coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p_row->'media_urls', '[]'::jsonb)) x), ARRAY[]::text[]),
    nullif(p_row->>'generated_by_agent', ''),
    nullif(p_row->>'generation_prompt', ''),
    nullif(p_row->>'internal_notes', ''),
    coalesce(nullif(p_row->>'priority', ''), 'medium'),
    coalesce(p_row->'metadata', '{}'::jsonb)
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('created', true, 'row', to_jsonb(v_row));
END;
$$;

ALTER FUNCTION public.admin_content_insert(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_content_insert(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_content_insert(jsonb) TO service_role;

-- PostgREST only sees a new function after its schema cache reloads.
NOTIFY pgrst, 'reload schema';
