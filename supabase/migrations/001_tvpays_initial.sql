-- TvPays initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.wallet_bucket AS ENUM ('deposit', 'spending', 'withdrawal');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'paid', 'failed', 'expired');
CREATE TYPE public.withdrawal_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected'
);
CREATE TYPE public.agent_status AS ENUM ('none', 'pending', 'approved', 'rejected');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  member_code text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles (id),
  plan_slug text NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  ads_points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  agent_status public.agent_status NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  deposit_balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (deposit_balance >= 0),
  spending_balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (spending_balance >= 0),
  withdrawal_balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (withdrawal_balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  bucket public.wallet_bucket NOT NULL,
  amount numeric(14, 2) NOT NULL,
  entry_type text NOT NULL,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wallet_ledger_user_created ON public.wallet_ledger (user_id, created_at DESC);

CREATE TABLE public.starpago_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  target_bucket public.wallet_bucket NOT NULL DEFAULT 'deposit',
  amount numeric(14, 2) NOT NULL,
  fee_rate numeric(8, 4) NOT NULL DEFAULT 0,
  fee_php numeric(14, 2) NOT NULL DEFAULT 0,
  net_php numeric(14, 2) NOT NULL,
  status public.deposit_status NOT NULL DEFAULT 'pending',
  pay_method text NOT NULL,
  mer_order_no text NOT NULL UNIQUE,
  order_no text,
  payment_link text,
  payer_mobile text,
  payer_name text,
  payer_email text,
  expires_at timestamptz,
  paid_at timestamptz,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX starpago_deposits_user ON public.starpago_deposits (user_id, created_at DESC);

CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  gross_amount numeric(14, 2) NOT NULL,
  tax_amount numeric(14, 2) NOT NULL,
  net_amount numeric(14, 2) NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  destination_type text NOT NULL,
  destination_number text NOT NULL,
  destination_name text NOT NULL,
  destination_bic text,
  paymongo_transfer_id text,
  payout_attempt integer NOT NULL DEFAULT 0,
  failure_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX withdrawals_status ON public.withdrawals (status, requested_at DESC);

CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  youtube_id text NOT NULL,
  duration_label text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'members')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ad_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  view_date date NOT NULL DEFAULT (timezone('Asia/Manila', now()))::date,
  reward_amount numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id, view_date)
);

CREATE TABLE public.daily_checkins (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  checkin_date date NOT NULL DEFAULT (timezone('Asia/Manila', now()))::date,
  reward_amount numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, checkin_date)
);

CREATE TABLE public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.agent_status NOT NULL DEFAULT 'pending',
  note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX agent_applications_one_open
  ON public.agent_applications (user_id)
  WHERE status = 'pending';

-- Atomic wallet credit/debit (service role / security definer)
CREATE OR REPLACE FUNCTION public.wallet_apply(
  p_user_id uuid,
  p_bucket public.wallet_bucket,
  p_delta numeric,
  p_entry_type text,
  p_reference_id text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d numeric;
  s numeric;
  w numeric;
BEGIN
  SELECT deposit_balance, spending_balance, withdrawal_balance
  INTO d, s, w
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  IF p_bucket = 'deposit' THEN d := d + p_delta;
  ELSIF p_bucket = 'spending' THEN s := s + p_delta;
  ELSE w := w + p_delta;
  END IF;

  IF d < 0 OR s < 0 OR w < 0 THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE wallets
  SET
    deposit_balance = d,
    spending_balance = s,
    withdrawal_balance = w,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO wallet_ledger (user_id, bucket, amount, entry_type, reference_id, metadata)
  VALUES (p_user_id, p_bucket, p_delta, p_entry_type, p_reference_id, p_meta);
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_apply(uuid, public.wallet_bucket, numeric, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_apply(uuid, public.wallet_bucket, numeric, text, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_apply(uuid, public.wallet_bucket, numeric, text, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.generate_member_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_member_code() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := 'TVP' || lpad((floor(random() * 999999)::int)::text, 6, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE member_code = code);
  END LOOP;
  RETURN code;
END;
$$;

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
  IF ref_input IS NOT NULL AND length(trim(ref_input)) > 0 THEN
    SELECT id INTO referrer
    FROM profiles
    WHERE referral_code = upper(trim(ref_input))
    LIMIT 1;
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.videos (title, youtube_id, duration_label, visibility, sort_order) VALUES
  ('Dracula Official Trailer (2025)', 'dQw4w9WgXcQ', '2:29', 'public', 1),
  ('THE BRUTALIST Final Trailer (2025)', 'dQw4w9WgXcQ', '1:36', 'members', 2),
  ('DEMON SLAYER (English Dub)', 'dQw4w9WgXcQ', '1:45', 'public', 3),
  ('DEMON SLAYER (Original)', 'dQw4w9WgXcQ', '1:53', 'members', 4);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starpago_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY wallets_select_own ON public.wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY ledger_select_own ON public.wallet_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY deposits_select_own ON public.starpago_deposits
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY withdrawals_select_own ON public.withdrawals
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY videos_select_all ON public.videos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ad_views_select_own ON public.ad_views
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY checkins_select_own ON public.daily_checkins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY agent_apps_select_own ON public.agent_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY agent_apps_insert_own ON public.agent_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
