-- Drama access, episode completions, renewals

CREATE TYPE public.drama_renewal_period AS ENUM ('week', 'month', 'year');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS drama_access_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_paid_plan_at timestamptz;

CREATE TABLE public.drama_episode_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  platform text NOT NULL,
  drama_id text NOT NULL,
  episode_number integer NOT NULL,
  view_date date NOT NULL,
  watch_seconds integer NOT NULL DEFAULT 0,
  reward_amount numeric(14, 2) NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform, drama_id, episode_number, view_date)
);

CREATE INDEX drama_episode_completions_user_date
  ON public.drama_episode_completions (user_id, view_date);

CREATE TABLE public.drama_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  period public.drama_renewal_period NOT NULL,
  price_php numeric(14, 2) NOT NULL,
  days_granted integer NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX drama_renewals_user_created
  ON public.drama_renewals (user_id, created_at DESC);

ALTER TABLE public.drama_episode_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drama_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY drama_episode_completions_select_own
  ON public.drama_episode_completions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY drama_renewals_select_own
  ON public.drama_renewals
  FOR SELECT
  USING (auth.uid() = user_id);
