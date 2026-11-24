-- StarPago merchant payouts initiated from HQ (not member withdrawals).

CREATE TABLE IF NOT EXISTS public.hq_merchant_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  amount_php numeric(14, 2) NOT NULL CHECK (amount_php > 0),
  destination_type text NOT NULL,
  destination_number text NOT NULL,
  destination_name text NOT NULL,
  destination_mobile text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  starpago_mer_order_no text,
  starpago_order_no text,
  starpago_order_status integer,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS hq_merchant_payouts_created
  ON public.hq_merchant_payouts (created_at DESC);

CREATE INDEX IF NOT EXISTS hq_merchant_payouts_status
  ON public.hq_merchant_payouts (status)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.hq_merchant_payouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hq_merchant_payouts FROM anon, authenticated;