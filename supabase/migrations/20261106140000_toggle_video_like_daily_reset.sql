-- Reset trailer "liked" state per Manila day: UI and RPC align so a new day can like again and earn (within cap).

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
  v_effective_liked boolean;
  v_want_liked boolean;
BEGIN
  SELECT ads_points INTO v_points
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT count(*)::integer INTO v_rewarded_today
  FROM public.video_likes
  WHERE user_id = p_user_id AND like_date = p_date AND points_awarded > 0;

  SELECT * INTO v_existing
  FROM public.video_likes
  WHERE user_id = p_user_id AND video_id = p_video_id;

  IF NOT FOUND THEN
    v_liked := true;
    IF v_rewarded_today < p_daily_cap THEN
      v_award := p_points;
    END IF;
    INSERT INTO public.video_likes (user_id, video_id, liked, like_date, points_awarded)
      VALUES (p_user_id, p_video_id, true, p_date, v_award);
    IF v_award > 0 THEN
      v_points := coalesce(v_points, 0) + v_award;
      UPDATE public.profiles
        SET ads_points = v_points, updated_at = now()
        WHERE id = p_user_id;
    END IF;
  ELSE
    v_effective_liked := v_existing.liked AND (v_existing.like_date = p_date);
    v_want_liked := NOT v_effective_liked;

    IF v_existing.like_date <> p_date THEN
      v_award := 0;
      IF v_want_liked THEN
        IF v_rewarded_today < p_daily_cap THEN
          v_award := p_points;
        END IF;
        UPDATE public.video_likes
          SET liked = true,
              like_date = p_date,
              points_awarded = v_award,
              updated_at = now()
          WHERE user_id = p_user_id AND video_id = p_video_id;
        IF v_award > 0 THEN
          v_points := coalesce(v_points, 0) + v_award;
          UPDATE public.profiles
            SET ads_points = v_points, updated_at = now()
            WHERE id = p_user_id;
        END IF;
      END IF;
      v_liked := v_want_liked;
    ELSIF v_existing.like_date = p_date THEN
      IF NOT v_want_liked THEN
        v_liked := false;
        v_award := 0;
        UPDATE public.video_likes
          SET liked = false, updated_at = now()
          WHERE user_id = p_user_id AND video_id = p_video_id;
      ELSE
        v_liked := true;
        v_award := 0;
        IF v_existing.points_awarded = 0 AND v_rewarded_today < p_daily_cap THEN
          v_award := p_points;
        END IF;
        UPDATE public.video_likes
          SET liked = true,
              points_awarded = CASE WHEN v_award > 0 THEN v_award ELSE v_existing.points_awarded END,
              updated_at = now()
          WHERE user_id = p_user_id AND video_id = p_video_id;
        IF v_award > 0 THEN
          v_points := coalesce(v_points, 0) + v_award;
          UPDATE public.profiles
            SET ads_points = v_points, updated_at = now()
            WHERE id = p_user_id;
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT count(*)::integer INTO v_rewarded_today
  FROM public.video_likes
  WHERE user_id = p_user_id AND like_date = p_date AND points_awarded > 0;

  SELECT ads_points INTO v_points FROM public.profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'liked', v_liked,
    'awarded', coalesce(v_award, 0),
    'ads_points', coalesce(v_points, 0),
    'likes_rewarded_today', v_rewarded_today,
    'daily_cap', p_daily_cap
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_video_like(uuid, uuid, date, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_video_like(uuid, uuid, date, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_video_like(uuid, uuid, date, integer, integer) TO service_role;
