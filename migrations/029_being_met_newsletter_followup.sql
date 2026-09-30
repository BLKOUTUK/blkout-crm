-- 029_being_met_newsletter_followup.sql — Being met, phase 3: row 1 follow-up, OFF (Wed 30 Sep 2026)
-- Applied via mcp__supabase__apply_migration as `being_met_newsletter_followup`.
--
-- The newsletter follow-up (promise table row 1; spec decisions 39, 41): one email, 24 hours
-- after sign-up, only once he has confirmed in SendFox. Sent by the Edge Function
-- being-met-newsletter-followup, every 15 minutes.
--
-- OFF: newsletter_followup_enabled = false. While off the function sends ONLY to test rows
-- (status 'test', address rob@ / rob+…@blkoutuk.com or Resend's simulator @resend.dev), and
-- marks the subject [TEST]. With the flag on, it still refuses to send to anyone until the
-- template carries approved_at and a reply_to address: Rob approves the copy first
-- (projects/membership/docs/being-met-outbound-copy-DRAFT-2026-09-30.md, row 1).
--
-- ROLLBACK:
--   SELECT cron.unschedule('being-met-newsletter-followup');
--   DROP FUNCTION IF EXISTS metrics.being_met_newsletter_followup();
--   ALTER TABLE public.being_met_config DROP COLUMN IF EXISTS newsletter_followup_enabled,
--     DROP COLUMN IF EXISTS newsletter_followup_delay, DROP COLUMN IF EXISTS newsletter_followup_template,
--     DROP COLUMN IF EXISTS newsletter_followup_last_run_at, DROP COLUMN IF EXISTS newsletter_followup_last_status;

ALTER TABLE public.being_met_config
  ADD COLUMN IF NOT EXISTS newsletter_followup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS newsletter_followup_delay interval NOT NULL DEFAULT '24 hours',
  ADD COLUMN IF NOT EXISTS newsletter_followup_template jsonb,
  ADD COLUMN IF NOT EXISTS newsletter_followup_last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS newsletter_followup_last_status text;

UPDATE public.being_met_config SET newsletter_followup_template = jsonb_build_object(
  'version', 'draft 2026-09-30',
  'approved_at', NULL,
  'approved_by', NULL,
  'reply_to', NULL,
  'subject', $s$You're on the BLKOUT list$s$,
  'body', $b$Hello {name},

Thanks for signing up to the BLKOUT newsletter. It will come to this address each time we send one.

BLKOUT is the Black Queer Men's Liberation Collective. We host gatherings, make space for conversation, and build community-owned technology for Black gay, bi and trans men across the UK.

If you're a Black queer man living in the UK, you're welcome in BLKOUTHUB, our online space where the conversation carries on between newsletters: https://blkouthub.com

Whoever you are, you can also:
- see what's on across the community: https://events.blkoutuk.com
- find Ivor's story and the journal: https://compass.blkoutuk.com
- start anywhere on our site: https://blkoutuk.com

If this wasn't you, reply and we'll remove your address.

BLKOUT

BLKOUT is not a crisis service. For urgent help: Samaritans 116 123 (free), NHS 111, or 999.$b$)
WHERE id = 1 AND newsletter_followup_template IS NULL;

CREATE OR REPLACE FUNCTION metrics.being_met_newsletter_followup() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE sec text;
BEGIN
  SELECT decrypted_secret INTO sec FROM vault.decrypted_secrets WHERE name = 'metrics_collector_secret';
  IF sec IS NULL THEN
    UPDATE public.being_met_config SET newsletter_followup_last_run_at = now(),
      newsletter_followup_last_status = 'FAILED: metrics_collector_secret missing from Vault; not called' WHERE id = 1;
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := 'https://bgjengudzfickgomjqmz.supabase.co/functions/v1/being-met-newsletter-followup',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', sec),
    timeout_milliseconds := 60000);
END $$;
REVOKE ALL ON FUNCTION metrics.being_met_newsletter_followup() FROM PUBLIC;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'being-met-newsletter-followup';
SELECT cron.schedule('being-met-newsletter-followup', '7,22,37,52 * * * *', $$SELECT metrics.being_met_newsletter_followup()$$);
