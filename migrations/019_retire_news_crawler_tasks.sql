-- 019_retire_news_crawler_tasks.sql — stop the task-dumping (Thu 10 Sep 2026)
-- Brief: apps/comms-blkout/docs/content-one-register-brief-2026-09-10.md, section D.
-- Applied via mcp__supabase__apply_migration as `retire_news_crawler_tasks` on 10 Sep 2026.
--
-- WHERE THE BRIEF POINTED, AND WHERE THE ROWS ACTUALLY CAME FROM
-- The brief said the producer of the 58 pending `news_crawler` rows was in ivor-core
-- (src/cron/scheduler.ts and/or src/api/socialMediaRoutes.ts) and asked for a PR there.
-- It is not. ivor-core contains no reference to `news_crawler`, to `socialsync_agent_tasks`
-- or to a crawler of any kind; its scheduler runs eight jobs, none of which touch that
-- table, and socialMediaRoutes.ts reads a different table (`social_content_calendar`).
-- No file in any BLKOUT repo produces these rows.
--
-- They are produced by two triggers on public.news_articles, created directly in the
-- database and never committed anywhere:
--
--   trigger_story_of_week_tasks   AFTER UPDATE  → create_story_of_week_tasks()
--       fires when is_story_of_week flips false/null → true, and inserts FOUR
--       socialsync_agent_tasks rows: a web hero image, an Instagram square, a LinkedIn
--       landscape and a Twitter/X image, each a prompt for an image generator.
--   trigger_featured_article_tasks AFTER INSERT → create_featured_article_tasks()
--       fires when an article arrives already published and featured/story-of-week, and
--       inserts one Instagram task of the same kind.
--
-- The four-at-a-time cadence in the data matches exactly: 4 rows at 00:00 UTC on the
-- Sundays news-blkout's fortnightly voting period rotated (1 Mar, 15 Mar, 29 Mar, 12 Apr,
-- 26 Apr, 17 May, 31 May, 14 Jun, 28 Jun, 26 Jul, 9 Aug, 23 Aug, 6 Sep 2026), each
-- carrying that period's winning article as sourceArticleId.
--
-- WHAT THEY DO BESIDES THE INSERT: nothing. Both trigger functions consist of the INSERTs
-- and `RETURN NEW`. They change no article, write nowhere else, and call nothing. Dropping
-- them removes the task-dumping and no other behaviour. Story of the Week itself is
-- untouched: it is `news_articles.is_story_of_week`, set by news-blkout's rotate-period,
-- and the news page reads the article, never these tasks.
--
-- NOTHING EVER CONSUMED THEM. The only reader of socialsync_agent_tasks is comms-blkout's
-- /admin/agents ApprovalQueue, which shows tasks whose status is `completed` AND which
-- carry generated_content. Every news_crawler row is status `pending` with
-- generated_content NULL, so not one of the 58 was ever displayed, let alone approved or
-- turned into an image. They accumulated for nine and a half months as a queue with no
-- worker at the other end.
--
-- The third function, generate_socialsync_tasks_for_article(uuid), is the same thing on
-- demand — no trigger calls it and no code anywhere calls it. It goes too, so a future
-- reader cannot restart the queue by finding it and assuming it is wired to something.

DROP TRIGGER IF EXISTS trigger_story_of_week_tasks   ON public.news_articles;
DROP TRIGGER IF EXISTS trigger_featured_article_tasks ON public.news_articles;

DROP FUNCTION IF EXISTS public.create_story_of_week_tasks();
DROP FUNCTION IF EXISTS public.create_featured_article_tasks();
DROP FUNCTION IF EXISTS public.generate_socialsync_tasks_for_article(uuid);

-- The backlog. Cancelled, not deleted: they are the record of what was being generated
-- and never read, and the note says so on the row itself rather than only here.
UPDATE public.socialsync_agent_tasks
SET status         = 'cancelled',
    approval_notes = 'cancelled 10 Sep 2026: crawler task-dumping retired; nothing consumed these',
    updated_at     = now()
WHERE agent_type = 'news_crawler'
  AND status = 'pending';

NOTIFY pgrst, 'reload schema';
