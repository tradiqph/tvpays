import { createAdminClient } from "@/lib/supabase/admin";
import { manilaViewDate } from "@/lib/drama-access";
import { daysRemainingUntil, formatDateManila, formatPhp } from "@/lib/format";
import { getMemberPackages } from "@/lib/member-packages";
import { DAILY_CHECKIN_PHP } from "@/lib/plans";

export type MemberNotification = {
  id: string;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
};

export async function getMemberNotifications(
  userId: string,
): Promise<MemberNotification[]> {
  const admin = createAdminClient();
  const now = Date.now();
  const today = manilaViewDate();
  const items: MemberNotification[] = [];

  const packages = await getMemberPackages(userId);
  const checkinTask = packages.globalTasks.find((t) => t.id === "checkin");
  if (checkinTask && !checkinTask.done) {
    items.push({
      id: `checkin-${today}`,
      title: "Daily check-in available",
      body: `Claim ${formatPhp(DAILY_CHECKIN_PHP)} on Tasks — once per day for all plans.`,
      href: "/task",
      createdAt: new Date().toISOString(),
    });
  }

  const { todayProgress, todayTargetActive } = packages.episodeTotals;
  if (todayTargetActive > todayProgress) {
    const left = todayTargetActive - todayProgress;
    items.push({
      id: `episodes-${today}`,
      title: "Episode tasks remaining",
      body: `Watch ${left} more earning episode${left === 1 ? "" : "s"} today (${todayProgress}/${todayTargetActive}).`,
      href: "/media",
      createdAt: new Date().toISOString(),
    });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("drama_access_ends_at, subscription_ends_at, trial_ends_at, plan_slug")
    .eq("id", userId)
    .single();

  if (profile?.drama_access_ends_at) {
    const days = daysRemainingUntil(profile.drama_access_ends_at);
    if (days >= 0 && days <= 7) {
      items.push({
        id: `drama-access-${profile.drama_access_ends_at.slice(0, 10)}`,
        title:
          days === 0
            ? "Video access ends today"
            : `Video access ends in ${days} day${days === 1 ? "" : "s"}`,
        body: `Renew or extend before ${formatDateManila(profile.drama_access_ends_at)}.`,
        href: "/renew",
        createdAt: profile.drama_access_ends_at,
      });
    }
  }

  if (
    profile?.subscription_ends_at &&
    profile.plan_slug &&
    profile.plan_slug !== "trial"
  ) {
    const days = daysRemainingUntil(profile.subscription_ends_at);
    if (days >= 0 && days <= 14) {
      items.push({
        id: `subscription-${profile.subscription_ends_at.slice(0, 10)}`,
        title:
          days === 0
            ? "Membership ends today"
            : `Membership ends in ${days} day${days === 1 ? "" : "s"}`,
        body: `Your plan stays active until ${formatDateManila(profile.subscription_ends_at)}. Browse upgrades anytime.`,
        href: "/subscriptions",
        createdAt: profile.subscription_ends_at,
      });
    }
  }

  if (profile?.trial_ends_at && !packages.activePlanSlug) {
    const trialMs = new Date(profile.trial_ends_at).getTime();
    if (trialMs > now && trialMs - now <= 3 * 86_400_000) {
      const days = daysRemainingUntil(profile.trial_ends_at);
      items.push({
        id: `trial-${profile.trial_ends_at.slice(0, 10)}`,
        title:
          days === 0
            ? "Free trial ends today"
            : `Free trial ends in ${days} day${days === 1 ? "" : "s"}`,
        body: "Upgrade to keep earning and unlock full episode limits.",
        href: "/subscriptions",
        createdAt: profile.trial_ends_at,
      });
    }
  }

  const since = new Date(now - 14 * 86_400_000).toISOString();
  const { data: withdrawals } = await admin
    .from("withdrawals")
    .select("id, status, net_amount, requested_at, completed_at, failure_reason")
    .eq("user_id", userId)
    .gte("requested_at", since)
    .order("requested_at", { ascending: false })
    .limit(8);

  for (const row of withdrawals ?? []) {
    const at = row.completed_at ?? row.requested_at;
    if (row.status === "pending" || row.status === "processing") {
      items.push({
        id: `withdrawal-pending-${row.id}`,
        title: "Withdrawal processing",
        body: `${formatPhp(Number(row.net_amount))} is being reviewed.`,
        href: "/wallet",
        createdAt: row.requested_at,
      });
    } else if (row.status === "completed") {
      items.push({
        id: `withdrawal-paid-${row.id}`,
        title: "Withdrawal sent",
        body: `${formatPhp(Number(row.net_amount))} was paid out.`,
        href: "/wallet",
        createdAt: at,
      });
    } else if (row.status === "failed" || row.status === "rejected") {
      items.push({
        id: `withdrawal-failed-${row.id}`,
        title: "Withdrawal needs attention",
        body:
          row.failure_reason?.trim() ||
          `${formatPhp(Number(row.net_amount))} could not be completed. Check Wallet for details.`,
        href: "/wallet",
        createdAt: at,
      });
    }
  }

  const refundSince = new Date(now - 30 * 86_400_000).toISOString();
  const { data: refunds } = await admin
    .from("wallet_ledger")
    .select("id, amount, reference_id, created_at")
    .eq("user_id", userId)
    .eq("entry_type", "plan_purchase_refund")
    .gte("created_at", refundSince)
    .order("created_at", { ascending: false })
    .limit(5);

  for (const row of refunds ?? []) {
    items.push({
      id: `refund-${row.id}`,
      title: "Plan purchase refund",
      body: `${formatPhp(Number(row.amount))} was returned to your deposit balance.`,
      href: "/wallet",
      createdAt: row.created_at,
    });
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return items;
}
