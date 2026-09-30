-- 015_metrics_collector.sql — analytics v2 phase 2 "Collect unattended" (Fri 4 Sep 2026)
-- Design: projects/analytics/docs/analytics-design-v2.md §6. Applied via
-- mcp__supabase__apply_migration as `metrics_collector` on 4 Sep 2026.
--
-- Secrets live in Supabase Vault (put/rotate: `printf '%s' "$V" | node scripts/ops/vault-put.mjs <name>`):
--   plausible_api_key · sendfox_api_key · heartbeat_api_key · coolify_api_token · coolify_base_url ·
--   github_token · telegram_bot_token · telegram_chat_id · metrics_collector_secret · metrics_ingest_secret
--
-- Rhythm: pg_cron 06:00 UTC on the 1st → metrics.collect_monthly() → (a) metrics.collect_internal()
-- writes every DB-side measure from the metrics.* views, then (b) pg_net POSTs to the Edge Function
-- metrics-snapshot (external sources: Plausible, SendFox, Heartbeat, Coolify, GitHub) with the shared
-- secret. Weekly Monday 08:00 UTC → metrics.alarm_unmet() → one Telegram line if anyone is waiting.
-- A failed source writes a `failed` row and a Telegram line. Nothing here writes 0 for a gap.

-- RPCs for the Edge Functions (the metrics schema is not in PostgREST). service_role only.
CREATE OR REPLACE FUNCTION public.metrics_secret(p_name text) RETURNS text
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = p_name LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.metrics_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.metrics_secret(text) TO service_role;

-- Upsert one snapshot row. Never downgrades an ok row to failed/absent, never touches a
-- baseline row (source 'baseline-…' is the record of 4 Sep 2026).
CREATE OR REPLACE FUNCTION public.metrics_snapshot_put(
  p_period text, p_measure text, p_value numeric, p_detail jsonb, p_source text, p_status text DEFAULT 'ok')
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO metrics.snapshots (taken_at, period, measure, value, detail, source, status)
  VALUES (now(), p_period, p_measure, p_value, coalesce(p_detail, '{}'::jsonb), p_source, coalesce(p_status, 'ok'))
  ON CONFLICT (period, measure) DO UPDATE
    SET taken_at = excluded.taken_at, value = excluded.value, detail = excluded.detail,
        source = excluded.source, status = excluded.status
    WHERE metrics.snapshots.source NOT LIKE 'baseline-%'
      AND (excluded.status = 'ok' OR metrics.snapshots.status <> 'ok')
  RETURNING id
$$;
REVOKE ALL ON FUNCTION public.metrics_snapshot_put(text, text, numeric, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.metrics_snapshot_put(text, text, numeric, jsonb, text, text) TO service_role;

-- One Telegram line to Rob (bot + chat from Vault). Returns the pg_net request id.
CREATE OR REPLACE FUNCTION metrics.telegram(p_text text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tok text; chat text;
BEGIN
  SELECT decrypted_secret INTO tok  FROM vault.decrypted_secrets WHERE name = 'telegram_bot_token';
  SELECT decrypted_secret INTO chat FROM vault.decrypted_secrets WHERE name = 'telegram_chat_id';
  IF tok IS NULL OR chat IS NULL THEN RETURN NULL; END IF;
  RETURN net.http_post(
    url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
    body := jsonb_build_object('chat_id', chat, 'text', p_text, 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 8000);
END $$;

-- DB-side measures for one period (default: the month just ended). Stocks are as-at now,
-- flows are the calendar month. Measure names match the 4 Sep baseline where the definition
-- is the same; a monthly flow gets a new name (events.added_month) rather than a 30-day one.
CREATE OR REPLACE FUNCTION metrics.collect_internal(p_period text DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  per   text := coalesce(p_period, to_char(date_trunc('month', now()) - interval '1 month', 'YYYY-MM'));
  p0    timestamptz; p1 timestamptz;
  src   text := 'metrics.collect_internal';
  n     int := 0;
  bm    record; fs record; tc record; nv record; r record;
  c1 int; c2 int; c3 int; c4 int;
BEGIN
  p0 := to_date(per || '-01', 'YYYY-MM-DD'); p1 := p0 + interval '1 month';

  -- Layer A — being met
  SELECT * INTO bm FROM metrics.being_met_live;
  SELECT * INTO fs FROM metrics.first_gestures_summary;
  PERFORM public.metrics_snapshot_put(per, 'gestures.total', bm.gestures_total, jsonb_build_object('origin','metrics.being_met_live','latest_gesture_at',fs.latest_gesture_at), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.live', fs.live, jsonb_build_object('origin','metrics.first_gestures_summary','definition','status IS NULL'), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.met', fs.met, jsonb_build_object('origin','metrics.first_gestures_summary','definition','status IS NULL AND met_at IS NOT NULL','met_any_status',bm.met), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.unmet', bm.unmet, jsonb_build_object('origin','metrics.being_met_live'), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.unmet_over_window', bm.unmet_over_window, jsonb_build_object('origin','metrics.being_met_live','window_hours',48,'alarm',true), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.last_30d', bm.gestures_30d, jsonb_build_object('origin','metrics.being_met_live'), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.met_in_window', bm.met_in_window, jsonb_build_object('origin','metrics.being_met_live','of_total',bm.gestures_total), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.acknowledged', bm.acknowledged, jsonb_build_object('origin','metrics.being_met_live'), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.landed', bm.landed, jsonb_build_object('origin','metrics.being_met_live','witnessed','his half, never targeted'), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.median_hours_to_met_90d', coalesce(bm.median_hours_to_met_90d, 0), jsonb_build_object('origin','metrics.being_met_live','null_means','no one met in 90 days'), src); n := n + 1;
  SELECT count(*) INTO c1 FROM public.first_gestures WHERE occurred_at >= p0 AND occurred_at < p1;
  PERFORM public.metrics_snapshot_put(per, 'gestures.in_month', c1, jsonb_build_object('origin','first_gestures occurred_at within period'), src); n := n + 1;

  -- Events
  FOR r IN SELECT * FROM metrics.event_interest_by_event LOOP
    PERFORM public.metrics_snapshot_put(per, 'events.interest.' || r.event_slug, r.signups, jsonb_build_object('origin','metrics.event_interest_by_event','could_help_organise',r.could_help_organise,'first',r.first_signup_at::date,'last',r.latest_signup_at::date), src); n := n + 1;
  END LOOP;
  SELECT coalesce(sum(rsvps), 0) INTO c1 FROM metrics.event_rsvps_by_event;
  PERFORM public.metrics_snapshot_put(per, 'events.rsvps', c1, jsonb_build_object('origin','metrics.event_rsvps_by_event'), src); n := n + 1;
  SELECT count(*), count(*) FILTER (WHERE status = 'approved'), count(*) FILTER (WHERE status = 'approved' AND date >= current_date) INTO c1, c2, c3 FROM public.events;
  PERFORM public.metrics_snapshot_put(per, 'events.rows', c1, jsonb_build_object('origin','events','approved',c2), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'events.approved', c2, jsonb_build_object('origin','events'), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'events.upcoming_approved', c3, jsonb_build_object('origin','events date >= current_date'), src); n := n + 1;
  SELECT count(*), count(*) FILTER (WHERE status = 'approved') INTO c1, c2 FROM public.events WHERE created_at >= p0 AND created_at < p1;
  PERFORM public.metrics_snapshot_put(per, 'events.added_month', c1, jsonb_build_object('origin','events created_at within period','approved',c2), src); n := n + 1;

  -- News
  SELECT count(*), count(*) FILTER (WHERE status = 'published') INTO c1, c2 FROM public.news_articles;
  PERFORM public.metrics_snapshot_put(per, 'news.articles', c1, jsonb_build_object('origin','news_articles'), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'news.published', c2, jsonb_build_object('origin','news_articles status=published'), src); n := n + 1;
  SELECT count(*) INTO c1 FROM public.news_articles WHERE created_at >= p0 AND created_at < p1;
  PERFORM public.metrics_snapshot_put(per, 'news.added_month', c1, jsonb_build_object('origin','news_articles created_at within period'), src); n := n + 1;
  SELECT * INTO nv FROM metrics.news_voting_current LIMIT 1;
  IF FOUND THEN
    PERFORM public.metrics_snapshot_put(per, 'news.voting.articles', nv.articles_in_period, jsonb_build_object('origin','metrics.news_voting_current','period_number',nv.period_number,'window',nv.start_date || '..' || nv.end_date), src); n := n + 1;
    PERFORM public.metrics_snapshot_put(per, 'news.voting.votes', nv.votes_ledger, jsonb_build_object('origin','metrics.news_voting_current','period_number',nv.period_number), src); n := n + 1;
  ELSE
    PERFORM public.metrics_snapshot_put(per, 'news.voting.articles', NULL, jsonb_build_object('note','no active voting period at collection'), src, 'absent'); n := n + 1;
  END IF;

  -- Newsletter editions, memberships
  SELECT count(*) INTO c1 FROM public.newsletter_editions;
  PERFORM public.metrics_snapshot_put(per, 'newsletter.editions', c1, jsonb_build_object('origin','newsletter_editions'), src); n := n + 1;
  SELECT coalesce(sum(members), 0) INTO c1 FROM metrics.memberships_by_tier;
  PERFORM public.metrics_snapshot_put(per, 'memberships.total', c1, jsonb_build_object('origin','metrics.memberships_by_tier','by_tier',(SELECT coalesce(jsonb_object_agg(tier || '/' || status, members), '{}'::jsonb) FROM metrics.memberships_by_tier)), src); n := n + 1;

  -- Layer C — tools, grants
  SELECT * INTO tc FROM metrics.tool_subscriptions_cost;
  PERFORM public.metrics_snapshot_put(per, 'tools.active', tc.active_subscriptions, jsonb_build_object('origin','metrics.tool_subscriptions_cost','latest_invoice_seen',tc.latest_invoice_seen), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'tools.monthly_cost_gbp', tc.monthly_cost_gbp, jsonb_build_object('origin','metrics.tool_subscriptions_cost'), src); n := n + 1;
  PERFORM public.metrics_snapshot_put(per, 'tools.annual_plans_gbp', tc.annual_cost_gbp, jsonb_build_object('origin','metrics.tool_subscriptions_cost'), src); n := n + 1;
  FOR r IN SELECT stage, count(*) AS n_, coalesce(sum(amount_requested), 0) AS req FROM metrics.grant_pipeline_live GROUP BY stage LOOP
    PERFORM public.metrics_snapshot_put(per, 'grants.' || r.stage, r.n_, jsonb_build_object('origin','metrics.grant_pipeline_live','requested_gbp',r.req), src); n := n + 1;
  END LOOP;
  RETURN n;
EXCEPTION WHEN OTHERS THEN
  PERFORM public.metrics_snapshot_put(per, 'internal.collect', NULL, jsonb_build_object('error', SQLERRM, 'rows_before_error', n), src, 'failed');
  PERFORM metrics.telegram('Metrics ' || per || ': internal collection FAILED after ' || n || ' rows — ' || SQLERRM);
  RETURN -1;
END $$;

-- The monthly entry point: internal rows, then the external collector.
CREATE OR REPLACE FUNCTION metrics.collect_monthly(p_period text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  per text := coalesce(p_period, to_char(date_trunc('month', now()) - interval '1 month', 'YYYY-MM'));
  n int; req bigint; sec text;
BEGIN
  n := metrics.collect_internal(per);
  SELECT decrypted_secret INTO sec FROM vault.decrypted_secrets WHERE name = 'metrics_collector_secret';
  IF sec IS NULL THEN
    PERFORM metrics.telegram('Metrics ' || per || ': collector secret missing from Vault — external sources NOT collected');
    RETURN jsonb_build_object('period', per, 'internal_rows', n, 'external', 'skipped: no secret');
  END IF;
  req := net.http_post(
    url := 'https://bgjengudzfickgomjqmz.supabase.co/functions/v1/metrics-snapshot',
    body := jsonb_build_object('period', per),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', sec),
    timeout_milliseconds := 20000);
  RETURN jsonb_build_object('period', per, 'internal_rows', n, 'external_request_id', req);
END $$;

-- The one alarm: anyone unmet past the window → one line to Rob. Silent otherwise.
CREATE OR REPLACE FUNCTION metrics.alarm_unmet() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n int; oldest timestamptz;
BEGIN
  SELECT unmet_over_window INTO n FROM metrics.being_met_live;
  SELECT min(occurred_at) INTO oldest FROM public.first_gestures
   WHERE met_at IS NULL AND status IS NULL AND occurred_at < now() - interval '48 hours';
  IF n > 0 THEN
    PERFORM metrics.telegram(format('Being met: %s men unmet past 48h. Oldest waiting since %s. Mission Control → Signals.', n, to_char(oldest, 'DD Mon YYYY')));
  END IF;
  RETURN jsonb_build_object('unmet_over_window', n, 'oldest', oldest, 'notified', n > 0);
END $$;

-- Schedules (idempotent).
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('metrics-monthly', 'metrics-alarm-weekly');
SELECT cron.schedule('metrics-monthly',      '0 6 1 * *', $$SELECT metrics.collect_monthly()$$);
SELECT cron.schedule('metrics-alarm-weekly', '0 8 * * 1', $$SELECT metrics.alarm_unmet()$$);
