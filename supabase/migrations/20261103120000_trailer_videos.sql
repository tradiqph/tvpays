-- MovieGasm trailer catalog fields

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS display_views bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ads_fund_display numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

-- Remove placeholder seed rows; sync will repopulate from RSS
DELETE FROM public.ad_views
WHERE video_id IN (SELECT id FROM public.videos WHERE youtube_id = 'dQw4w9WgXcQ');

DELETE FROM public.videos WHERE youtube_id = 'dQw4w9WgXcQ';

CREATE UNIQUE INDEX IF NOT EXISTS videos_youtube_id_unique ON public.videos (youtube_id);
