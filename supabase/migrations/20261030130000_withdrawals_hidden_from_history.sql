ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS hidden_from_history boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.withdrawals.hidden_from_history IS
  'When true, omit from HQ withdrawal queue UI and member withdrawal history (row kept for audit).';

-- Ford: hide three duplicate ₱3,000 completed test payouts (StarPago order refs).
UPDATE public.withdrawals
SET hidden_from_history = true
WHERE id IN (
  '8cf83c76-fc9d-4dfb-ad6b-e23d607db81d',
  '86231865-6984-4e64-992d-4676dcd52401',
  '694636ec-28b0-40e1-acd9-b28c59096563'
);
