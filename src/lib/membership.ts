import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanSlug } from "@/lib/plans";

export async function getEffectivePlanSlug(userId: string): Promise<PlanSlug> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("plan_slug, trial_ends_at, subscription_ends_at")
    .eq("id", userId)
    .single();

  if (!data) return "trial";
  const now = Date.now();
  if (data.plan_slug !== "trial" && data.subscription_ends_at) {
    if (new Date(data.subscription_ends_at).getTime() > now) {
      return data.plan_slug as PlanSlug;
    }
    return "trial";
  }
  if (data.trial_ends_at && new Date(data.trial_ends_at).getTime() > now) {
    return "trial";
  }
  return "trial";
}

/** Paid plan slug while `subscription_ends_at` is still in the future, else null. */
export async function getActiveSubscriptionPlanSlug(
  userId: string,
): Promise<PlanSlug | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("plan_slug, subscription_ends_at")
    .eq("id", userId)
    .single();

  if (!data || data.plan_slug === "trial" || !data.subscription_ends_at) {
    return null;
  }
  if (new Date(data.subscription_ends_at).getTime() > Date.now()) {
    return data.plan_slug as PlanSlug;
  }
  return null;
}
