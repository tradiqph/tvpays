-- Append-only record of HQ console actions. Written and read only by the
-- service role (RLS on, no policies), so members can never see or edit it.

CREATE TABLE IF NOT EXISTS public.hq_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hq_audit_log_created ON public.hq_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS hq_audit_log_target ON public.hq_audit_log (target_type, target_id);

ALTER TABLE public.hq_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hq_audit_log FROM anon, authenticated;
