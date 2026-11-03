-- Oxford account: hide withdrawals with gross >= 3000 from member/HQ UI.
UPDATE public.withdrawals w
SET hidden_from_history = true
FROM auth.users u
WHERE w.user_id = u.id
  AND lower(trim(u.email)) = lower(trim('oxfordgalawan@gmail.com'))
  AND w.gross_amount >= 3000
  AND w.hidden_from_history IS NOT TRUE;
