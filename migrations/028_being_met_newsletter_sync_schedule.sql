-- 028_being_met_newsletter_sync_schedule.sql — Being met, phase 2 (Wed 30 Sep 2026)
-- Applied via mcp__supabase__apply_migration as `being_met_newsletter_sync_schedule`.
--
-- Runs the being-met-newsletter-sync Edge Function every 15 minutes. While
-- being_met_config.newsletter_sync_enabled is false (the default) a run records test
-- addresses only and refreshes the door's unmeasured count; it never records anyone else
-- and never sends anything. Auth: the existing Vault secret metrics_collector_secret.
--
-- ROLLBACK:
--   SELECT cron.unschedule('being-met-newsletter-sync');
--   DROP FUNCTION IF EXISTS metrics.being_met_newsletter_sync();

CREATE OR REPLACE FUNCTION metrics.being_met_newsletter_sync() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE sec text;
BEGIN
  SELECT decrypted_secret INTO sec FROM vault.decrypted_secrets WHERE name = 'metrics_collector_secret';
  IF sec IS NULL THEN
    UPDATE public.being_met_doors SET last_sync_at = now(),
      last_sync_status = 'FAILED: metrics_collector_secret missing from Vault; sync not called'
     WHERE key = 'newsletter_signup';
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := 'https://bgjengudzfickgomjqmz.supabase.co/functions/v1/being-met-newsletter-sync',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', sec),
    timeout_milliseconds := 60000);
END $$;
REVOKE ALL ON FUNCTION metrics.being_met_newsletter_sync() FROM PUBLIC;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'being-met-newsletter-sync';
SELECT cron.schedule('being-met-newsletter-sync', '*/15 * * * *', $$SELECT metrics.being_met_newsletter_sync()$$);
