-- Member transfer between deposit and withdrawal buckets (atomic).
CREATE OR REPLACE FUNCTION public.wallet_transfer_internal(
  p_user_id uuid,
  p_from public.wallet_bucket,
  p_to public.wallet_bucket,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF p_from = p_to THEN
    RAISE EXCEPTION 'invalid_transfer';
  END IF;

  IF p_from NOT IN ('deposit', 'withdrawal') OR p_to NOT IN ('deposit', 'withdrawal') THEN
    RAISE EXCEPTION 'invalid_transfer';
  END IF;

  ref := 'xfer:' || gen_random_uuid()::text;

  PERFORM public.wallet_apply(
    p_user_id,
    p_from,
    -p_amount,
    'wallet_transfer_out',
    ref,
    jsonb_build_object('to', p_to::text)
  );

  PERFORM public.wallet_apply(
    p_user_id,
    p_to,
    p_amount,
    'wallet_transfer_in',
    ref,
    jsonb_build_object('from', p_from::text)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wallet_transfer_internal(uuid, public.wallet_bucket, public.wallet_bucket, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_transfer_internal(uuid, public.wallet_bucket, public.wallet_bucket, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_transfer_internal(uuid, public.wallet_bucket, public.wallet_bucket, numeric) TO service_role;
