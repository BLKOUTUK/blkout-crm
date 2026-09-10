-- 017_admin_finance_rpc.sql — comms /admin/finance, "the books" (Thu 10 Sep 2026)
-- Brief: apps/comms-blkout/docs/finance-one-system-brief-2026-09-10.md. Applied via
-- mcp__supabase__apply_migration as `admin_finance_rpc` on 10 Sep 2026.
--
-- Purpose: one read for the /admin/finance page. Finance is one system, not two — the
-- ledger is the bookkeeping pipeline in ~/blkout/projects/financial-management/ (bank
-- CSVs → accounts-map.json → build-finance.mjs → finance.json), written monthly through
-- Mission Control's statement upload. build-finance.mjs then publishes nine `finance.*`
-- measures into metrics.snapshots with source 'ingest:build-finance'. This function is
-- the only way those rows reach a browser: the metrics schema is not exposed over
-- PostgREST and metrics.* has no grant to any API role, so the read runs SECURITY
-- DEFINER, service_role-only, from comms-blkout's own server behind a session bearer.
--
-- `books` is the LATEST row per finance.* measure by taken_at — not a period filter.
-- The books are a running position, so "the most recent publish" is the right answer even
-- when the statement month lags. It is JSON null when nothing has ever been published;
-- the page must render that as "the books have not been published yet", never as zeroes.
-- Note for anyone writing a proof: `admin_finance_snapshot()->'books'` returns the JSON
-- value null, not SQL NULL, so test it with jsonb_typeof(...) = 'null'.
--
-- `subscriptions` returns every row, active and cancelled, with every column — the caller
-- filters. The CRM's own /financial page is retired in the same change: it read
-- public.financial_transactions, which has never held a row.

CREATE OR REPLACE FUNCTION public.admin_finance_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, metrics, pg_temp
AS $$
  SELECT jsonb_build_object(
    -- Latest publish per measure. jsonb_object_agg over no rows is NULL, which is exactly
    -- the "never published" signal the page needs; nothing here substitutes a number.
    'books', (
      SELECT jsonb_object_agg(
               s.measure,
               jsonb_build_object(
                 'value',    s.value,
                 'period',   s.period,
                 'taken_at', s.taken_at,
                 'detail',   s.detail))
      FROM (
        SELECT DISTINCT ON (n.measure)
               n.measure, n.value, n.period, n.taken_at, n.detail
        FROM metrics.snapshots n
        WHERE n.measure LIKE 'finance.%'
        ORDER BY n.measure, n.taken_at DESC
      ) s),

    'subscriptions', (
      SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.service_name), '[]'::jsonb)
      FROM public.subscriptions t),

    'subscriptions_cost', (
      SELECT to_jsonb(c) FROM metrics.tool_subscriptions_cost c),

    'generated_at', now()
  )
$$;

ALTER FUNCTION public.admin_finance_snapshot() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.admin_finance_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finance_snapshot() TO service_role;

-- PostgREST only sees a new function after its schema cache reloads.
NOTIFY pgrst, 'reload schema';
