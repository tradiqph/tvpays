import { createAdminClient } from "@/lib/supabase/admin";

export type HqAction =
  | "withdrawal.pay"
  | "withdrawal.sync"
  | "withdrawal.reject"
  | "withdrawal.frozen_refund"
  | "withdrawal.frozen_complete"
  | "agent.approve"
  | "agent.reject"
  | "member.suspend"
  | "member.reactivate"
  | "member.password_reset"
  | "member.wallet_credit"
  | "member.grant_plan"
  | "member.assign_upline"
  | "member.set_password"
  | "team.grant"
  | "team.revoke";

/** Records an HQ action. Never throws: a logging failure must not undo the action. */
export async function logHqAction(
  actor: { id: string; email?: string | null },
  action: HqAction,
  target: { type: string; id: string },
  details: Record<string, unknown> = {},
) {
  try {
    const { error } = await createAdminClient().from("hq_audit_log").insert({
      actor_id: actor.id,
      actor_email: actor.email ?? null,
      action,
      target_type: target.type,
      target_id: target.id,
      details,
    });
    if (error) console.error("[hq-audit]", error.message);
  } catch (e) {
    console.error("[hq-audit]", e);
  }
}
