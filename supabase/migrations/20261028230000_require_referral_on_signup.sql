-- Sign-up must include a valid upline referral code (enforced server-side).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code text;
  referrer uuid;
  ref_input text;
BEGIN
  ref_input := NEW.raw_user_meta_data ->> 'referral_code';

  IF ref_input IS NULL OR length(trim(ref_input)) = 0 THEN
    RAISE EXCEPTION 'referral_required';
  END IF;

  SELECT id INTO referrer
  FROM profiles
  WHERE referral_code = upper(trim(ref_input))
  LIMIT 1;

  IF referrer IS NULL THEN
    RAISE EXCEPTION 'invalid_referral_code';
  END IF;

  LOOP
    ref_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = ref_code);
  END LOOP;

  INSERT INTO profiles (
    id,
    member_code,
    display_name,
    referral_code,
    referred_by,
    plan_slug,
    trial_ends_at
  )
  VALUES (
    NEW.id,
    generate_member_code(),
    coalesce(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    ref_code,
    referrer,
    'trial',
    now() + interval '15 days'
  );

  INSERT INTO wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
