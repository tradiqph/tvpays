-- Trailer likes: +5 Ads Points per like, capped per Manila day at the plan's ad count.
-- A like row is permanent (liked toggles), so unlike/re-like never earns twice.

CREATE TABLE IF NOT EXISTS public.video_likes (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  liked boolean NOT NULL DEFAULT true,
  like_date date NOT NULL DEFAULT (timezone('Asia/Manila', now()))::date,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);

CREATE INDEX IF NOT EXISTS video_likes_user_date_idx
  ON public.video_likes (user_id, like_date)
  WHERE points_awarded > 0;

ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS video_likes_select_own ON public.video_likes;
CREATE POLICY video_likes_select_own ON public.video_likes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Atomic toggle. Locks the profile row so concurrent taps cannot exceed the cap.
CREATE OR REPLACE FUNCTION public.toggle_video_like(
  p_user_id uuid,
  p_video_id uuid,
  p_date date,
  p_daily_cap integer,
  p_points integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.video_likes%ROWTYPE;
  v_rewarded_today integer;
  v_award integer := 0;
  v_liked boolean;
  v_points integer;
BEGIN
  SELECT ads_points INTO v_points
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT count(*) INTO v_rewarded_today
  FROM public.video_likes
  WHERE user_id = p_user_id AND like_date = p_date AND points_awarded > 0;

  SELECT * INTO v_existing
  FROM public.video_likes
  WHERE user_id = p_user_id AND video_id = p_video_id;

  IF FOUND THEN
    v_liked := NOT v_existing.liked;
    UPDATE public.video_likes
      SET liked = v_liked, updated_at = now()
      WHERE user_id = p_user_id AND video_id = p_video_id;
  ELSE
    v_liked := true;
    IF v_rewarded_today < p_daily_cap THEN
      v_award := p_points;
      v_rewarded_today := v_rewarded_today + 1;
    END IF;
    INSERT INTO public.video_likes (user_id, video_id, liked, like_date, points_awarded)
      VALUES (p_user_id, p_video_id, true, p_date, v_award);
    IF v_award > 0 THEN
      v_points := coalesce(v_points, 0) + v_award;
      UPDATE public.profiles
        SET ads_points = v_points, updated_at = now()
        WHERE id = p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'liked', v_liked,
    'awarded', v_award,
    'ads_points', coalesce(v_points, 0),
    'likes_rewarded_today', v_rewarded_today,
    'daily_cap', p_daily_cap
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_video_like(uuid, uuid, date, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_video_like(uuid, uuid, date, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_video_like(uuid, uuid, date, integer, integer) TO service_role;
