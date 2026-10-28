import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectivePlanSlug } from "@/lib/membership";
import { planBySlug } from "@/lib/plans";
import { enabledPlatforms } from "@/lib/shortdrama";

export const TRIAL_DAILY_FINISH_LIMIT = 10;
export const MIN_WATCH_SECONDS = 30;
export const MIN_WATCH_RATIO = 0.8;

export type DramaAccessErrorCode =
  | "drama_locked"
  | "trial_daily_cap"
  | "trial_provider_locked"
  | "renewal_required";

export class DramaAccessError extends Error {
  constructor(
    message: string,
    public code: DramaAccessErrorCode,
  ) {
    super(message);
    this.name = "DramaAccessError";
  }
}

export function manilaViewDate(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function defaultDramaPlatform(): string {
  const override = process.env.DRAMASDK_TRIAL_PROVIDER?.trim().toLowerCase();
  const enabled = enabledPlatforms();
  if (override && enabled.includes(override)) return override;
  return enabled[0];
}

type ProfileAccessRow = {
  trial_ends_at: string | null;
  drama_access_ends_at: string | null;
  first_paid_plan_at: string | null;
};

async function loadProfile(userId: string): Promise<ProfileAccessRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("trial_ends_at, drama_access_ends_at, first_paid_plan_at")
    .eq("id", userId)
    .single();
  if (error || !data) throw new Error("profile_not_found");
  return data;
}

function trialActive(profile: ProfileAccessRow, now = Date.now()): boolean {
  return (
    !!profile.trial_ends_at &&
    new Date(profile.trial_ends_at).getTime() > now
  );
}

function dramaAccessActive(profile: ProfileAccessRow, now = Date.now()): boolean {
  return (
    !!profile.drama_access_ends_at &&
    new Date(profile.drama_access_ends_at).getTime() > now
  );
}

export async function countCompletionsToday(userId: string): Promise<number> {
  const admin = createAdminClient();
  const today = manilaViewDate();
  const { count } = await admin
    .from("drama_episode_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("view_date", today);
  return count ?? 0;
}

export async function countPaidCompletionsToday(userId: string): Promise<number> {
  const admin = createAdminClient();
  const today = manilaViewDate();
  const { count } = await admin
    .from("drama_episode_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("view_date", today)
    .gt("reward_amount", 0);
  return count ?? 0;
}

/** Stack `addDays` onto active access, or from now if expired. */
export function stackedAccessEndIso(
  currentEndIso: string | null | undefined,
  addDays: number,
  nowMs = Date.now(),
): string {
  const base =
    currentEndIso && new Date(currentEndIso).getTime() > nowMs
      ? new Date(currentEndIso).getTime()
      : nowMs;
  const ends = new Date(base);
  ends.setDate(ends.getDate() + addDays);
  return ends.toISOString();
}

export async function extendDramaAccess(
  userId: string,
  days: number,
): Promise<string> {
  const admin = createAdminClient();
  const profile = await loadProfile(userId);
  const iso = stackedAccessEndIso(profile.drama_access_ends_at, days);

  await admin
    .from("profiles")
    .update({
      drama_access_ends_at: iso,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return iso;
}

export async function getDramaAccess(userId: string) {
  const profile = await loadProfile(userId);
  const now = Date.now();
  const planSlug = await getEffectivePlanSlug(userId);
  const plan = planBySlug(planSlug)!;
  const onTrial = planSlug === "trial" && trialActive(profile, now);
  const dramaActive = dramaAccessActive(profile, now);
  const finishesToday = await countCompletionsToday(userId);
  const paidFinishesToday = await countPaidCompletionsToday(userId);

  let canWatch = false;
  let watchMode: "trial" | "paid" | "none" = "none";
  if (dramaActive) {
    canWatch = true;
    watchMode = "paid";
  } else if (onTrial) {
    canWatch = finishesToday < TRIAL_DAILY_FINISH_LIMIT;
    watchMode = "trial";
  }

  return {
    canWatch,
    watchMode,
    dramaAccessActive: dramaActive,
    dramaAccessEndsAt: profile.drama_access_ends_at,
    trialActive: onTrial,
    trialEndsAt: profile.trial_ends_at,
    firstPaidPlanAt: profile.first_paid_plan_at,
    defaultPlatform: defaultDramaPlatform(),
    finishesToday,
    finishLimitTrial: TRIAL_DAILY_FINISH_LIMIT,
    episodesCompletedForEarningsToday: paidFinishesToday,
    episodesEarningLimit: plan.adsPerDay,
    effectivePlanSlug: planSlug,
    needsRenewal:
      !dramaActive &&
      !onTrial &&
      (profile.first_paid_plan_at != null || planSlug !== "trial"),
    needsSubscription:
      !onTrial && !dramaActive && profile.first_paid_plan_at == null,
  };
}

export async function assertCanStreamEpisode(
  userId: string,
  platform: string,
): Promise<void> {
  const profile = await loadProfile(userId);
  const now = Date.now();
  const planSlug = await getEffectivePlanSlug(userId);
  const onTrial = planSlug === "trial" && trialActive(profile, now);
  const dramaActive = dramaAccessActive(profile, now);

  if (dramaActive) {
    return;
  }

  if (onTrial) {
    const def = defaultDramaPlatform();
    if (platform !== def) {
      throw new DramaAccessError(
        "Free trial is limited to the default drama source.",
        "trial_provider_locked",
      );
    }
    const finishes = await countCompletionsToday(userId);
    if (finishes >= TRIAL_DAILY_FINISH_LIMIT) {
      throw new DramaAccessError(
        "Daily trial limit reached. Finish more episodes tomorrow or upgrade.",
        "trial_daily_cap",
      );
    }
    return;
  }

  if (profile.first_paid_plan_at != null || planSlug !== "trial") {
    throw new DramaAccessError(
      "Drama access expired. Renew to keep watching.",
      "renewal_required",
    );
  }

  throw new DramaAccessError(
    "Subscribe to Elite or higher to watch dramas.",
    "drama_locked",
  );
}

export function watchSecondsQualify(
  watchSeconds: number,
  durationSeconds?: number | null,
): boolean {
  if (watchSeconds < MIN_WATCH_SECONDS) return false;
  if (durationSeconds != null && durationSeconds > 0) {
    return watchSeconds >= durationSeconds * MIN_WATCH_RATIO;
  }
  return true;
}
