import { createAdminClient } from "@/lib/supabase/admin";
import {
  planBySlug,
  adRewardPerView,
  DAILY_CHECKIN_PHP,
  upgradeChargePhp,
  type PlanSlug,
} from "@/lib/plans";
import { walletApply } from "@/lib/wallet";
import { distributeReferralRewards } from "@/lib/referrals";
import {
  getEffectivePlanSlug,
  getActiveSubscriptionPlanSlug,
} from "@/lib/membership";
import {
  settleForfeitedDays,
  countAdsToday,
  forfeitedCatchUpAllowance,
  getAdCreditLimits,
  type AdViewKind,
} from "@/lib/forfeited-tasks";
import { manilaViewDate } from "@/lib/manila-date";
export { getEffectivePlanSlug } from "@/lib/membership";

export type AdViewCreditResult = {
  amount: number;
  adsToday: number;
  adsLimit: number;
  regularToday: number;
  regularLimit: number;
  forfeitedToday: number;
  forfeitedLimit: number;
  forfeitedBalance: number;
  kind: AdViewKind;
};

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

  return { ...plan, chargedPhp: chargePhp };
}

export async function creditAdView(
  userId: string,
  videoId: string,
): Promise<AdViewCreditResult> {
  const planSlug = await getEffectivePlanSlug(userId);
  const plan = planBySlug(planSlug)!;
  const reward = adRewardPerView(plan);

  await settleForfeitedDays(userId);

  const admin = createAdminClient();
  const today = manilaViewDate();

  const regularToday = await countAdsToday(userId, today, "regular");
  const forfeitedToday = await countAdsToday(userId, today, "forfeited");

  const { data: profBal } = await admin
    .from("profiles")
    .select("forfeited_balance, ads_points")
    .eq("id", userId)
    .single();
  const forfeitedBalance = Number(profBal?.forfeited_balance ?? 0);

  let kind: AdViewKind;
  if (regularToday < plan.adsPerDay) {
    kind = "regular";
  } else {
    const allowance = forfeitedCatchUpAllowance(
      plan,
      forfeitedBalance,
      forfeitedToday,
    );
    if (allowance <= 0) {
      throw new Error(
        forfeitedBalance > 0 ? "forfeited_limit" : "daily_limit",
      );
    }
    kind = "forfeited";
  }

  const { error: insertErr } = await admin.from("ad_views").insert({
    user_id: userId,
    video_id: videoId,
    view_date: today,
    reward_amount: reward,
    view_kind: kind,
  });

  if (insertErr) {
    if (insertErr.code === "23505") throw new Error("already_viewed");
    throw new Error(insertErr.message);
  }

  await walletApply(userId, "withdrawal", reward, "ad_reward", videoId, {
    date: today,
    forfeit_catch_up: kind === "forfeited",
  });

  if (kind === "forfeited") {
    const deduct = Math.min(reward, forfeitedBalance);
    const newBalance = Math.round((forfeitedBalance - deduct) * 100) / 100;
    await admin
      .from("profiles")
      .update({
        forfeited_balance: Math.max(0, newBalance),
        ads_points: (profBal?.ads_points ?? 0) + 10,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } else {
    await admin
      .from("profiles")
      .update({ ads_points: (profBal?.ads_points ?? 0) + 10 })
      .eq("id", userId);
  }

  const limits = await getAdCreditLimits(userId, plan);
  return {
    amount: reward,
    adsToday: limits.adsToday,
    adsLimit: limits.adsLimit,
    regularToday: limits.regularToday,
    regularLimit: limits.regularLimit,
    forfeitedToday: limits.forfeitedToday,
    forfeitedLimit: limits.forfeitedLimit,
    forfeitedBalance: limits.forfeitedBalance,
    kind,
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
