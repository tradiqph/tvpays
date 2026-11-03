import { createAdminClient } from "@/lib/supabase/admin";
import {
  planBySlug,
  adRewardPerView,
  DAILY_CHECKIN_PHP,
  upgradeChargePhp,
  type PlanSlug,
} from "@/lib/plans";
import { walletApply } from "@/lib/wallet";
import {
  distributeReferralRewards,
  maybeAgentDirectSaleBonus,
} from "@/lib/referrals";
import {
  getEffectivePlanSlug,
  getActiveSubscriptionPlanSlug,
} from "@/lib/membership";
export { getEffectivePlanSlug } from "@/lib/membership";

/** Legacy no-op (stacked drama payouts removed). */
export async function repairStackedEpisodeRewardsIfNeeded(_userId: string) {
  return;
}

export async function purchasePlan(userId: string, slug: string) {
  const plan = planBySlug(slug);
  if (!plan || plan.pricePhp <= 0 || plan.slug === "trial") {
    throw new Error("invalid_plan");
  }

  const activeSlug = await getActiveSubscriptionPlanSlug(userId);
  const fromSlug = (activeSlug ?? "trial") as PlanSlug;

  let chargePhp: number;
  try {
    chargePhp = upgradeChargePhp(fromSlug, plan.slug);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid_plan";
    throw new Error(msg);
  }

  const admin = createAdminClient();
  const purchaseRef = `plan:${slug}:${Date.now()}`;
  await walletApply(userId, "deposit", -chargePhp, "plan_purchase", slug, {
    upgrade_from: fromSlug,
    upgrade_to: plan.slug,
    list_price_to: plan.pricePhp,
    charged: chargePhp,
  });

  const { data: existing } = await admin
    .from("profiles")
    .select("first_paid_plan_at, subscription_ends_at")
    .eq("id", userId)
    .single();

  const nowIso = new Date().toISOString();
  const profileUpdate: {
    plan_slug: string;
    subscription_ends_at?: string;
    first_paid_plan_at: string;
    updated_at: string;
  } = {
    plan_slug: plan.slug,
    first_paid_plan_at: existing?.first_paid_plan_at ?? nowIso,
    updated_at: nowIso,
  };

  if (!activeSlug) {
    const ends = new Date();
    ends.setDate(ends.getDate() + plan.durationDays);
    profileUpdate.subscription_ends_at = ends.toISOString();
  }

  await admin.from("profiles").update(profileUpdate).eq("id", userId);

  await distributeReferralRewards(
    userId,
    chargePhp,
    "referral_upgrade",
    purchaseRef,
  );
  await maybeAgentDirectSaleBonus(userId, chargePhp, purchaseRef);

  return { ...plan, chargedPhp: chargePhp };
}

export async function creditAdView(
  userId: string,
  videoId: string,
): Promise<{ amount: number; adsToday: number; adsLimit: number }> {
  const planSlug = await getEffectivePlanSlug(userId);
  const plan = planBySlug(planSlug)!;
  const reward = adRewardPerView(plan);

  const admin = createAdminClient();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  const { count } = await admin
    .from("ad_views")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("view_date", today);

  const adsToday = count ?? 0;
  if (adsToday >= plan.adsPerDay) {
    throw new Error("daily_limit");
  }

  const { error: insertErr } = await admin.from("ad_views").insert({
    user_id: userId,
    video_id: videoId,
    view_date: today,
    reward_amount: reward,
  });

  if (insertErr) {
    if (insertErr.code === "23505") throw new Error("already_viewed");
    throw new Error(insertErr.message);
  }

  await walletApply(userId, "withdrawal", reward, "ad_reward", videoId, {
    date: today,
  });

  const { data: prof } = await admin
    .from("profiles")
    .select("ads_points")
    .eq("id", userId)
    .single();
  await admin
    .from("profiles")
    .update({ ads_points: (prof?.ads_points ?? 0) + 10 })
    .eq("id", userId);

  return {
    amount: reward,
    adsToday: adsToday + 1,
    adsLimit: plan.adsPerDay,
  };
}

export async function dailyCheckin(userId: string): Promise<number> {
  const admin = createAdminClient();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });

  const { error } = await admin.from("daily_checkins").insert({
    user_id: userId,
    checkin_date: today,
    reward_amount: DAILY_CHECKIN_PHP,
  });

  if (error) {
    if (error.code === "23505") throw new Error("already_checked_in");
    throw new Error(error.message);
  }

  await walletApply(
    userId,
    "withdrawal",
    DAILY_CHECKIN_PHP,
    "daily_checkin",
    today,
  );
  return DAILY_CHECKIN_PHP;
}
