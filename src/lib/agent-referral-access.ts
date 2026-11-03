import { createAdminClient } from "@/lib/supabase/admin";
import { planBySlug } from "@/lib/plans";

export type AgentReferralGatePayload = {
  code: "agent_required";
  agentStatus: string;
  canApply: boolean;
};

export async function getAgentReferralGate(
  userId: string,
): Promise<AgentReferralGatePayload | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("agent_status, plan_slug")
    .eq("id", userId)
    .single();

  if (!profile) {
    return {
      code: "agent_required",
      agentStatus: "none",
      canApply: false,
    };
  }

  if (profile.agent_status === "approved") {
    return null;
  }

  const plan = planBySlug(profile.plan_slug ?? "trial");
  const canApply = Boolean(plan?.minForAgent);

  return {
    code: "agent_required",
    agentStatus: profile.agent_status ?? "none",
    canApply,
  };
}
