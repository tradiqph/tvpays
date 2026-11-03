import { createAdminClient } from "@/lib/supabase/admin";
import { manilaViewDate } from "@/lib/manila-date";
import {
  planBySlug,
  adRewardPerView,
  type PlanSlug,
  type SubscriptionPlan,
} from "@/lib/plans";

export type AdViewKind = "regular" | "forfeited";

export type ForfeitedCatchUpState = {
  balance: number;
  catchUpProgress: number;
  catchUpTarget: number;
  visible: boolean;
  regularDoneToday: boolean;
  regularToday: number;
  regularLimit: number;
  forfeitedToday: number;
  forfeitedLimit: number;
};

type PlanSegment = {
  slug: PlanSlug;
  startMs: number;
  endMs: number;
};

function addManilaDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  const dt = new Date(utc);
  return dt.toISOString().slice(0, 10);
}

function manilaDateFromIso(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  });
}

function startOfManilaDayMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00+08:00`).getTime();
}

function endOfManilaDayMsFixed(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999+08:00`).getTime();
}

function dateInSegment(dateStr: string, seg: PlanSegment): boolean {
  const dayStart = startOfManilaDayMs(dateStr);
  const dayEnd = endOfManilaDayMsFixed(dateStr);
  return dayStart <= seg.endMs && dayEnd >= seg.startMs;
}

async function buildPlanSegments(userId: string): Promise<PlanSegment[]> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("created_at, trial_ends_at, subscription_ends_at")
    .eq("id", userId)
    .single();

  if (!profile) return [];

  const { data: purchases } = await admin
    .from("wallet_ledger")
    .select("reference_id, created_at")
    .eq("user_id", userId)
    .eq("entry_type", "plan_purchase")
    .order("created_at", { ascending: true });

  const segments: PlanSegment[] = [];
  const purchaseList = purchases ?? [];

  for (let i = 0; i < purchaseList.length; i++) {
    const row = purchaseList[i];
    const slug = (row.reference_id ?? "elite") as PlanSlug;
    const plan = planBySlug(slug);
    if (!plan || plan.pricePhp <= 0) continue;

    const startMs = new Date(row.created_at).getTime();
    const nextAt = purchaseList[i + 1]?.created_at;
    let endMs: number;
    if (nextAt) {
      endMs = new Date(nextAt).getTime() - 1;
    } else if (profile.subscription_ends_at) {
      endMs = new Date(profile.subscription_ends_at).getTime();
    } else {
      endMs = Date.now();
    }
    if (endMs >= startMs) {
      segments.push({ slug, startMs, endMs });
    }
  }

  if (profile.trial_ends_at) {
    const trialEndMs = new Date(profile.trial_ends_at).getTime();
    const trialStartMs = new Date(profile.created_at).getTime();
    if (trialEndMs > trialStartMs) {
      const firstPaidStart = purchaseList[0]?.created_at
        ? new Date(purchaseList[0].created_at).getTime()
        : null;
      const trialSegEnd =
        firstPaidStart != null && firstPaidStart < trialEndMs
          ? firstPaidStart - 1
          : trialEndMs;
      if (trialSegEnd >= trialStartMs) {
        segments.push({
          slug: "trial",
          startMs: trialStartMs,
          endMs: trialSegEnd,
        });
      }
    }
  }

  return segments;
}

export async function planForManilaDate(
  userId: string,
  dateStr: string,
  segments?: PlanSegment[],
): Promise<SubscriptionPlan | null> {
  const segs = segments ?? (await buildPlanSegments(userId));
  const paid = segs.filter((s) => s.slug !== "trial" && dateInSegment(dateStr, s));
  if (paid.length > 0) {
    const best = paid.sort((a, b) => b.startMs - a.startMs)[0];
    return planBySlug(best.slug) ?? null;
  }
  const trial = segs.find((s) => s.slug === "trial" && dateInSegment(dateStr, s));
  if (trial) return planBySlug("trial") ?? null;
  return null;
}

export async function countAdsToday(
  userId: string,
  today: string,
  kind?: AdViewKind,
): Promise<number> {
  const admin = createAdminClient();
  let q = admin
    .from("ad_views")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("view_date", today);
  if (kind) {
    q = q.eq("view_kind", kind);
  }
  const { count } = await q;
  return count ?? 0;
}

export function maxForfeitedAdsToday(
  plan: SubscriptionPlan,
  forfeitedBalance: number,
): number {
  const reward = adRewardPerView(plan);
  if (reward <= 0 || forfeitedBalance <= 0) return 0;
  const affordable = Math.floor(forfeitedBalance / reward + 1e-9);
  return Math.min(3, Math.max(0, affordable));
}

export function forfeitedCatchUpAllowance(
  plan: SubscriptionPlan,
  forfeitedBalance: number,
  forfeitedAdsToday: number,
): number {
  const maxAds = maxForfeitedAdsToday(plan, forfeitedBalance);
  return Math.max(0, maxAds - forfeitedAdsToday);
}

async function sumEarnedOnDate(userId: string, dateStr: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ad_views")
    .select("reward_amount")
    .eq("user_id", userId)
    .eq("view_date", dateStr);
  return (data ?? []).reduce((s, r) => s + Number(r.reward_amount), 0);
}

export async function settleForfeitedDays(userId: string): Promise<void> {
  const admin = createAdminClient();
  const today = manilaViewDate();
  const yesterday = addManilaDays(today, -1);

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "created_at, forfeited_balance, forfeited_settled_through",
    )
    .eq("id", userId)
    .single();

  if (!profile) return;

  const accountStart = manilaDateFromIso(profile.created_at);
  let cursor = profile.forfeited_settled_through
    ? addManilaDays(profile.forfeited_settled_through, 1)
    : accountStart;

  if (cursor > yesterday) return;

  const segments = await buildPlanSegments(userId);
  let balance = Number(profile.forfeited_balance ?? 0);

  while (cursor <= yesterday) {
    const plan = await planForManilaDate(userId, cursor, segments);
    if (plan) {
      const target = plan.dailyIncomeDisplay;
      const earned = await sumEarnedOnDate(userId, cursor);
      const add = Math.max(0, Math.round((target - earned) * 100) / 100);
      balance = Math.round((balance + add) * 100) / 100;
    }
    cursor = addManilaDays(cursor, 1);
  }

  await admin
    .from("profiles")
    .update({
      forfeited_balance: balance,
      forfeited_settled_through: yesterday,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

export async function getForfeitedBalance(userId: string): Promise<number> {
  await settleForfeitedDays(userId);
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("forfeited_balance")
    .eq("id", userId)
    .single();
  return Number(data?.forfeited_balance ?? 0);
}

export async function buildForfeitedCatchUpState(
  userId: string,
  plan: SubscriptionPlan,
): Promise<ForfeitedCatchUpState> {
  await settleForfeitedDays(userId);
  const today = manilaViewDate();
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("forfeited_balance")
    .eq("id", userId)
    .single();

  const balance = Number(profile?.forfeited_balance ?? 0);
  const regularToday = await countAdsToday(userId, today, "regular");
  const forfeitedToday = await countAdsToday(userId, today, "forfeited");
  const regularLimit = plan.adsPerDay;
  const regularDoneToday = regularToday >= regularLimit;
  const forfeitedLimit = regularDoneToday
    ? maxForfeitedAdsToday(plan, balance)
    : 0;
  const catchUpTarget = forfeitedLimit;
  const catchUpProgress = Math.min(forfeitedToday, catchUpTarget);

  return {
    balance,
    catchUpProgress,
    catchUpTarget,
    visible: balance > 0,
    regularDoneToday,
    regularToday,
    regularLimit,
    forfeitedToday,
    forfeitedLimit,
  };
}

export type AdCreditLimits = {
  adsToday: number;
  adsLimit: number;
  regularToday: number;
  regularLimit: number;
  forfeitedToday: number;
  forfeitedLimit: number;
  forfeitedBalance: number;
};

export async function getAdCreditLimits(
  userId: string,
  plan: SubscriptionPlan,
): Promise<AdCreditLimits> {
  const state = await buildForfeitedCatchUpState(userId, plan);
  const adsLimit =
    state.regularLimit +
    (state.regularDoneToday ? state.forfeitedLimit : 0);
  const adsToday = state.regularToday + state.forfeitedToday;
  return {
    adsToday,
    adsLimit,
    regularToday: state.regularToday,
    regularLimit: state.regularLimit,
    forfeitedToday: state.forfeitedToday,
    forfeitedLimit: state.forfeitedLimit,
    forfeitedBalance: state.balance,
  };
}
