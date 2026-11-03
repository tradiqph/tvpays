import { createAdminClient } from "@/lib/supabase/admin";
import {
  planBySlug,
  adRewardPerView,
  DAILY_CHECKIN_PHP,
  type PlanSlug,
} from "@/lib/plans";
import { getActiveSubscriptionPlanSlug } from "@/lib/membership";
import { manilaViewDate } from "@/lib/manila-date";
import { formatPhp } from "@/lib/format";
import {
  buildForfeitedCatchUpState,
  countAdsToday,
  type ForfeitedCatchUpState,
} from "@/lib/forfeited-tasks";

const EARNING_ENTRY_TYPES = ["drama_episode", "ad_reward", "daily_checkin"] as const;

export type PackageTask = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  done: boolean;
  href?: string;
  action?: "checkin";
};

/** Daily ad earning task for the member's current plan. */
export type PlanPackageTask = {
  id: string;
  planSlug: PlanSlug;
  planName: string;
  status: ActivatedPackage["status"];
  progress: number;
  target: number;
  perEpisodeDisplay: number;
  dailyPotentialDisplay: number;
  done: boolean;
  periodLabel: string;
};

export type EpisodeTaskTotals = {
  todayProgress: number;
  todayTargetActive: number;
  dailySlotsAllActivated: number;
  dailyPotentialAllActivated: number;
};

export type ActivatedPackage = {
  slug: PlanSlug;
  name: string;
  purchasedAt: string;
  pricePhp: number;
  status: "active" | "replaced" | "expired";
  subscriptionEndsAt: string | null;
  dramaBundleDays: number;
  episodesPerDay: number;
  dailyPotential: number;
  totalPotential: number;
  earnedInPeriod: number;
};

export type MemberPackagesPayload = {
  packages: ActivatedPackage[];
  activePlanSlug: PlanSlug | null;
  totalPotentialDisplay: number;
  totalEarnedAllTime: number;
  totalEarnedActivePeriod: number;
  planTasks: PlanPackageTask[];
  episodeTotals: EpisodeTaskTotals;
  globalTasks: PackageTask[];
  forfeited: ForfeitedCatchUpState;
};

function sumEarningsInWindow(
  rows: { amount: number; created_at: string }[],
  startIso: string,
  endIso: string,
): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return rows.reduce((sum, row) => {
    const t = new Date(row.created_at).getTime();
    if (t >= start && t < end && row.amount > 0) {
      return sum + Number(row.amount);
    }
    return sum;
  }, 0);
}

export async function getMemberPackages(userId: string): Promise<MemberPackagesPayload> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "plan_slug, subscription_ends_at, trial_ends_at, xp, level, agent_status, created_at",
    )
    .eq("id", userId)
    .single();

  const activePlanSlug = await getActiveSubscriptionPlanSlug(userId);

  const { data: purchases } = await admin
    .from("wallet_ledger")
    .select("reference_id, amount, created_at")
    .eq("user_id", userId)
    .eq("entry_type", "plan_purchase")
    .order("created_at", { ascending: true });

  const { data: earningRows } = await admin
    .from("wallet_ledger")
    .select("amount, entry_type, created_at")
    .eq("user_id", userId)
    .eq("bucket", "withdrawal")
    .in("entry_type", [...EARNING_ENTRY_TYPES])
    .order("created_at", { ascending: true });

  const earnings = earningRows ?? [];
  const totalEarnedAllTime = earnings.reduce(
    (s, r) => s + (Number(r.amount) > 0 ? Number(r.amount) : 0),
    0,
  );

  const today = manilaViewDate();

  const regularToday = await countAdsToday(userId, today, "regular");
  const adsToday = regularToday;

  const purchaseList = purchases ?? [];
  const packages: ActivatedPackage[] = [];
  const packagePeriods: {
    pkg: ActivatedPackage;
    periodStart: string;
    periodEnd: string;
  }[] = [];

  for (let i = 0; i < purchaseList.length; i++) {
    const row = purchaseList[i];
    const slug = (row.reference_id ?? "elite") as PlanSlug;
    const plan = planBySlug(slug);
    if (!plan || plan.pricePhp <= 0) continue;

    const nextAt = purchaseList[i + 1]?.created_at ?? nowIso;
    const earnedInPeriod = sumEarningsInWindow(
      earnings,
      row.created_at,
      nextAt,
    );

    const isLast = i === purchaseList.length - 1;
    let status: ActivatedPackage["status"] = "replaced";
    if (isLast && activePlanSlug === slug) {
      status = "active";
    } else if (isLast && profile?.plan_slug === slug) {
      status = "expired";
    }

    const pkg: ActivatedPackage = {
      slug,
      name: plan.name,
      purchasedAt: row.created_at,
      pricePhp: Math.abs(Number(row.amount)),
      status,
      subscriptionEndsAt:
        isLast && profile?.plan_slug === slug
          ? profile.subscription_ends_at
          : null,
      dramaBundleDays: plan.dramaBundleDays,
      episodesPerDay: plan.episodesPerDay,
      dailyPotential: plan.dailyIncomeDisplay,
      totalPotential: plan.totalRevenueDisplay,
      earnedInPeriod,
    };
    packages.push(pkg);
    packagePeriods.push({
      pkg,
      periodStart: row.created_at,
      periodEnd: nextAt,
    });
  }

  const trialEnds = profile?.trial_ends_at;
  const trialActive =
    trialEnds && new Date(trialEnds).getTime() > Date.now() && !activePlanSlug;
  if (trialActive && trialEnds) {
    const trial = planBySlug("trial")!;
    const trialStart =
      profile?.created_at ??
      new Date(
        new Date(trialEnds).getTime() - trial.durationDays * 86_400_000,
      ).toISOString();
    const trialPkg: ActivatedPackage = {
      slug: "trial",
      name: trial.name,
      purchasedAt: trialStart,
      pricePhp: 0,
      status: "active",
      subscriptionEndsAt: trialEnds,
      dramaBundleDays: 0,
      episodesPerDay: trial.episodesPerDay,
      dailyPotential: trial.dailyIncomeDisplay,
      totalPotential: trial.totalRevenueDisplay,
      earnedInPeriod: sumEarningsInWindow(earnings, trialStart, nowIso),
    };
    packages.unshift(trialPkg);
    packagePeriods.unshift({
      pkg: trialPkg,
      periodStart: trialStart,
      periodEnd: nowIso,
    });
  }

  const effectiveSlug = (activePlanSlug ??
    profile?.plan_slug ??
    "trial") as PlanSlug;
  const effectivePlan = planBySlug(effectiveSlug) ?? planBySlug("trial")!;
  const totalPotentialDisplay = effectivePlan.totalRevenueDisplay;

  const totalEarnedActivePeriod =
    packages.find((p) => p.status === "active")?.earnedInPeriod ??
    packages.at(-1)?.earnedInPeriod ??
    0;

  const { data: checkin } = await admin
    .from("daily_checkins")
    .select("checkin_date")
    .eq("user_id", userId)
    .eq("checkin_date", today)
    .maybeSingle();

  const xp = profile?.xp ?? 0;

  const displayPackages = [...packages].reverse();

  const activePkg =
    displayPackages.find((p) => p.status === "active") ??
    displayPackages[0] ??
    null;
  const taskPlanSlug = (activePlanSlug ?? effectiveSlug) as PlanSlug;
  const taskPlan = planBySlug(taskPlanSlug) ?? effectivePlan;
  const adTarget = taskPlan.adsPerDay;
  const adProgress = Math.min(adsToday, adTarget);

  const planTasks: PlanPackageTask[] = [
    {
      id: `ads-${taskPlanSlug}`,
      planSlug: taskPlanSlug,
      planName: taskPlan.name,
      status: activePkg?.status ?? "active",
      progress: adProgress,
      target: adTarget,
      perEpisodeDisplay: adRewardPerView(taskPlan),
      dailyPotentialDisplay: taskPlan.dailyIncomeDisplay,
      done: adsToday >= adTarget,
      periodLabel: "Today",
    },
  ];

  const episodeTotals: EpisodeTaskTotals = {
    todayProgress: adsToday,
    todayTargetActive: adTarget,
    dailySlotsAllActivated: adTarget,
    dailyPotentialAllActivated: taskPlan.dailyIncomeDisplay,
  };

  const globalTasks: PackageTask[] = [
    {
      id: "checkin",
      title: "Daily check-in",
      description: checkin
        ? "Claimed today"
        : `${formatPhp(DAILY_CHECKIN_PHP)} to withdrawal · once per day`,
      progress: checkin ? 1 : 0,
      target: 1,
      done: !!checkin,
      action: checkin ? undefined : "checkin",
    },
    {
      id: "level",
      title: "Level progress",
      description: `Level ${profile?.level ?? 1} — earn XP from ads and activity`,
      progress: xp,
      target: 500,
      done: xp >= 500,
      href: "/profile",
    },
  ];

  if (effectivePlan.minForAgent && profile?.agent_status === "none") {
    globalTasks.push({
      id: "agent",
      title: "Apply for Agent program",
      description:
        "Approved Agents get an active referral link and L1–L3 commissions on upgrades",
      progress: 0,
      target: 1,
      done: false,
      href: "/profile",
    });
  }

  const forfeited = await buildForfeitedCatchUpState(userId, taskPlan);

  return {
    packages: displayPackages,
    activePlanSlug,
    totalPotentialDisplay,
    totalEarnedAllTime,
    totalEarnedActivePeriod,
    planTasks,
    episodeTotals,
    globalTasks,
    forfeited,
  };
}

export function packageStatusLabel(status: ActivatedPackage["status"]): string {
  switch (status) {
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    default:
      return "Previous";
  }
}
