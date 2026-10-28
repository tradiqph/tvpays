import { createAdminClient } from "@/lib/supabase/admin";
import {
  planBySlug,
  adRewardPerView,
  DAILY_CHECKIN_PHP,
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
import {
  extendDramaAccess,
  manilaViewDate,
  stackedAccessEndIso,
  watchSecondsQualify,
} from "@/lib/drama-access";
import { renewalByPeriod } from "@/lib/drama-renewals";

export { getEffectivePlanSlug } from "@/lib/membership";

export async function purchasePlan(userId: string, slug: string) {
  const plan = planBySlug(slug);
  if (!plan || plan.pricePhp <= 0 || plan.slug === "trial") {
    throw new Error("invalid_plan");
  }

  const activeSlug = await getActiveSubscriptionPlanSlug(userId);
  if (activeSlug === plan.slug) {
    throw new Error("plan_already_active");
  }

  const admin = createAdminClient();
  await walletApply(userId, "deposit", -plan.pricePhp, "plan_purchase", slug);

  const { data: existing } = await admin
    .from("profiles")
    .select(
      "first_paid_plan_at, plan_slug, subscription_ends_at, drama_access_ends_at",
    )
    .eq("id", userId)
    .single();

  const nowMs = Date.now();
  const ends = new Date();
  ends.setDate(ends.getDate() + plan.durationDays);

  const dramaAccessEndsAt =
    plan.dramaBundleDays > 0
      ? stackedAccessEndIso(
          existing?.drama_access_ends_at,
          plan.dramaBundleDays,
          nowMs,
        )
      : existing?.drama_access_ends_at ?? null;

  const nowIso = new Date().toISOString();
  await admin
    .from("profiles")
    .update({
      plan_slug: plan.slug,
      subscription_ends_at: ends.toISOString(),
      drama_access_ends_at: dramaAccessEndsAt,
      first_paid_plan_at: existing?.first_paid_plan_at ?? nowIso,
      updated_at: nowIso,
    })
    .eq("id", userId);

  await distributeReferralRewards(
    userId,
    plan.pricePhp,
    "referral_upgrade",
    `plan:${slug}:${Date.now()}`,
  );
  await maybeAgentDirectSaleBonus(
    userId,
    plan.pricePhp,
    `plan:${slug}:${Date.now()}`,
  );

  return plan;
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

export async function creditDramaEpisode(
  userId: string,
  input: {
    platform: string;
    drama_id: string;
    episode_number: number;
    watch_seconds: number;
    duration_seconds?: number | null;
    finished: boolean;
  },
): Promise<{
  rewarded: boolean;
  amount: number;
  episodesToday: number;
  episodesLimit: number;
  finishesToday: number;
}> {
  if (!input.finished) {
    throw new Error("not_finished");
  }
  if (
    !watchSecondsQualify(input.watch_seconds, input.duration_seconds ?? null)
  ) {
    throw new Error("insufficient_watch");
  }

  const planSlug = await getEffectivePlanSlug(userId);
  const plan = planBySlug(planSlug)!;
  const today = manilaViewDate();
  const admin = createAdminClient();
  const ref = `${input.platform}:${input.drama_id}:${input.episode_number}`;

  const { count: finishCount } = await admin
    .from("drama_episode_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("view_date", today);

  const { count: paidCount } = await admin
    .from("drama_episode_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("view_date", today)
    .gt("reward_amount", 0);

  const paidToday = paidCount ?? 0;
  const canPay = paidToday < plan.adsPerDay;
  const reward = canPay ? adRewardPerView(plan) : 0;

  const { error: insertErr } = await admin.from("drama_episode_completions").insert({
    user_id: userId,
    platform: input.platform,
    drama_id: input.drama_id,
    episode_number: input.episode_number,
    view_date: today,
    watch_seconds: input.watch_seconds,
    reward_amount: reward,
  });

  if (insertErr) {
    if (insertErr.code === "23505") throw new Error("already_completed");
    throw new Error(insertErr.message);
  }

  if (reward > 0) {
    await walletApply(userId, "withdrawal", reward, "drama_episode", ref, {
      date: today,
      platform: input.platform,
      drama_id: input.drama_id,
      episode: input.episode_number,
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
  }

  return {
    rewarded: reward > 0,
    amount: reward,
    episodesToday: paidToday + (reward > 0 ? 1 : 0),
    episodesLimit: plan.adsPerDay,
    finishesToday: (finishCount ?? 0) + 1,
  };
}

export async function purchaseDramaRenewal(
  userId: string,
  period: "week" | "month" | "year",
) {
  const option = renewalByPeriod(period);
  if (!option) throw new Error("invalid_period");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("first_paid_plan_at")
    .eq("id", userId)
    .single();

  if (!profile?.first_paid_plan_at) {
    throw new Error("subscription_required");
  }

  const ref = `drama_renew:${period}:${Date.now()}`;
  await walletApply(
    userId,
    "deposit",
    -option.pricePhp,
    "drama_renewal",
    ref,
    { period },
  );

  const startsAt = new Date().toISOString();
  const endsAt = await extendDramaAccess(userId, option.days);

  await admin.from("drama_renewals").insert({
    user_id: userId,
    period,
    price_php: option.pricePhp,
    days_granted: option.days,
    starts_at: startsAt,
    ends_at: endsAt,
    reference_id: ref,
  });

  return { endsAt, option };
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
