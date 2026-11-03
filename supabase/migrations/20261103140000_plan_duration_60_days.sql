-- Align existing paid members with 60-day plan term (from first paid purchase).
UPDATE public.profiles
SET
  subscription_ends_at = first_paid_plan_at + interval '60 days',
  updated_at = now()
WHERE plan_slug IS DISTINCT FROM 'trial'
  AND first_paid_plan_at IS NOT NULL;
