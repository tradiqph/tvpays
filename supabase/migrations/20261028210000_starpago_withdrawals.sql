ALTER TYPE public.withdrawal_status ADD VALUE IF NOT EXISTS 'frozen';

ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS starpago_order_no text,
  ADD COLUMN IF NOT EXISTS starpago_mer_order_no text,
  ADD COLUMN IF NOT EXISTS starpago_order_status integer,
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none'
    CHECK (refund_status IN ('none', 'pending', 'completed'));

CREATE UNIQUE INDEX IF NOT EXISTS withdrawals_starpago_mer_order_no_key
  ON public.withdrawals (starpago_mer_order_no)
  WHERE starpago_mer_order_no IS NOT NULL;
