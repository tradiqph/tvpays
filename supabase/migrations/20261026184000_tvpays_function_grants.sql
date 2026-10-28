-- Lock down SECURITY DEFINER functions (Supabase security advisor)

ALTER FUNCTION public.generate_member_code() SET search_path = public;

REVOKE ALL ON FUNCTION public.generate_member_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_member_code() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.wallet_apply(uuid, public.wallet_bucket, numeric, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wallet_apply(uuid, public.wallet_bucket, numeric, text, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_apply(uuid, public.wallet_bucket, numeric, text, text, jsonb) TO service_role;
