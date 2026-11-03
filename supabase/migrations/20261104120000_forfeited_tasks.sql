ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS forfeited_balance numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forfeited_settled_through date;

ALTER TABLE public.ad_views
  ADD COLUMN IF NOT EXISTS view_kind text NOT NULL DEFAULT 'regular';

ALTER TABLE public.ad_views
  DROP CONSTRAINT IF EXISTS ad_views_view_kind_check;

ALTER TABLE public.ad_views
  ADD CONSTRAINT ad_views_view_kind_check
  CHECK (view_kind IN ('regular', 'forfeited'));

CREATE INDEX IF NOT EXISTS ad_views_user_date_kind_idx
  ON public.ad_views (user_id, view_date, view_kind);
