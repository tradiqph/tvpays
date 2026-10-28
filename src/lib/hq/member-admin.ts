import { createAdminClient } from "@/lib/supabase/admin";
import type { HqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import { stackedAccessEndIso } from "@/lib/drama-access";
import {
  MAX_TOPUP_PHP,
  planBySlug,
  type PlanSlug,
} from "@/lib/plans";
import { walletApply, type WalletBucket } from "@/lib/wallet";
import { clampText, isUuid } from "@/lib/security/input";

export const MIN_MEMBER_PASSWORD_LENGTH = 6;
export const HQ_WALLET_CREDIT_MAX_PHP = MAX_TOPUP_PHP;

export type HqActor = { id: string; email?: string | null };

export function validateMemberPassword(password: string): string | null {
  const t = password.trim();
  if (t.length < MIN_MEMBER_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_MEMBER_PASSWORD_LENGTH} characters`;
  }
  return null;
}

/** Block HQ from mutating other staff unless actor is super admin. */
export async function assertHqCanManageMember(
  session: HqSession,
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isUuid(targetUserId)) {
    return { ok: false, error: "Invalid member", status: 400 };
  }

  const admin = createAdminClient();
  const { data: target, error } = await admin.auth.admin.getUserById(targetUserId);
  if (error || !target.user) {
    return { ok: false, error: "Member not found", status: 404 };
  }

  const targetRole = target.user.app_metadata?.role;
  if (
    (targetRole === "hq" || targetRole === "super_admin") &&
    !session.isSuper
  ) {
    return {
      ok: false,
      error: "Only a super admin can manage staff accounts",
      status: 403,
    };
  }

  return { ok: true };
}

export async function hqCreditWallet(input: {
  userId: string;
  bucket: WalletBucket;
  amount: number;
  note?: string;
  actor: HqActor;
}) {
  if (input.bucket !== "deposit" && input.bucket !== "withdrawal") {
    throw new Error("Only deposit or withdrawal buckets can be credited");
  }
  const amount = Math.round(input.amount * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (amount > HQ_WALLET_CREDIT_MAX_PHP) {
    throw new Error(
      `Maximum credit is ₱${HQ_WALLET_CREDIT_MAX_PHP.toLocaleString("en-PH")}`,
    );
  }

  const entryType =
    input.bucket === "deposit" ? "hq_credit_deposit" : "hq_credit_withdrawal";
  const ref = `hq:${input.actor.id}:${Date.now()}`;

  await walletApply(input.userId, input.bucket, amount, entryType, ref, {
    note: input.note ? clampText(input.note, 500) : null,
    actor_id: input.actor.id,
  });

  await logHqAction(
    { id: input.actor.id, email: input.actor.email },
    "member.wallet_credit",
    { type: "member", id: input.userId },
    {
      bucket: input.bucket,
      amount,
      note: input.note ? clampText(input.note, 500) : undefined,
    },
  );
}

export async function hqGrantPlan(input: {
  userId: string;
  planSlug: string;
  note?: string;
  actor: HqActor;
}) {
  const plan = planBySlug(input.planSlug);
  if (!plan || plan.pricePhp <= 0 || plan.slug === "trial") {
    throw new Error("Invalid plan");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select(
      "first_paid_plan_at, plan_slug, subscription_ends_at, drama_access_ends_at",
    )
    .eq("id", input.userId)
    .single();

  if (!existing) throw new Error("Member not found");

  const nowMs = Date.now();
  const subBase =
    existing.subscription_ends_at &&
    new Date(existing.subscription_ends_at).getTime() > nowMs
      ? new Date(existing.subscription_ends_at)
      : new Date();
  const ends = new Date(subBase);
  ends.setDate(ends.getDate() + plan.durationDays);

  const dramaAccessEndsAt =
    plan.dramaBundleDays > 0
      ? stackedAccessEndIso(
          existing.drama_access_ends_at,
          plan.dramaBundleDays,
          nowMs,
        )
      : existing.drama_access_ends_at ?? null;

  const nowIso = new Date().toISOString();
  const slug = plan.slug as PlanSlug;

  await walletApply(input.userId, "deposit", 0, "plan_purchase", slug, {
    hq_grant: true,
    note: input.note ? clampText(input.note, 500) : null,
    actor_id: input.actor.id,
  });

  await admin
    .from("profiles")
    .update({
      plan_slug: slug,
      subscription_ends_at: ends.toISOString(),
      drama_access_ends_at: dramaAccessEndsAt,
      first_paid_plan_at: existing.first_paid_plan_at ?? nowIso,
      updated_at: nowIso,
    })
    .eq("id", input.userId);

  await logHqAction(
    { id: input.actor.id, email: input.actor.email },
    "member.grant_plan",
    { type: "member", id: input.userId },
    {
      slug: plan.slug,
      note: input.note ? clampText(input.note, 500) : undefined,
    },
  );

  return plan;
}

async function uplineChainContains(
  startUserId: string,
  searchId: string,
  maxDepth = 32,
): Promise<boolean> {
  const admin = createAdminClient();
  let current: string | null = startUserId;
  for (let i = 0; i < maxDepth && current; i++) {
    if (current === searchId) return true;
    const nextRes = await admin
      .from("profiles")
      .select("referred_by")
      .eq("id", current)
      .maybeSingle();
    const referredBy = nextRes.data?.referred_by as string | null | undefined;
    current = referredBy ?? null;
  }
  return false;
}

export async function hqAssignUpline(input: {
  userId: string;
  uplineId: string;
  actor: HqActor;
}) {
  if (input.userId === input.uplineId) {
    throw new Error("Member cannot be their own upline");
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("profiles")
    .select("id, referred_by")
    .eq("id", input.userId)
    .maybeSingle();

  if (!member) throw new Error("Member not found");
  if (member.referred_by) {
    throw new Error("This member already has an upline");
  }

  const { data: upline } = await admin
    .from("profiles")
    .select("id, member_code")
    .eq("id", input.uplineId)
    .maybeSingle();

  if (!upline) throw new Error("Upline member not found");

  if (await uplineChainContains(input.uplineId, input.userId)) {
    throw new Error("This upline would create a referral cycle");
  }

  const { error } = await admin
    .from("profiles")
    .update({ referred_by: input.uplineId, updated_at: new Date().toISOString() })
    .eq("id", input.userId);

  if (error) throw new Error(error.message);

  await logHqAction(
    { id: input.actor.id, email: input.actor.email },
    "member.assign_upline",
    { type: "member", id: input.userId },
    { upline_id: input.uplineId, upline_code: upline.member_code },
  );
}

export async function setMemberPassword(
  userId: string,
  password: string,
): Promise<void> {
  const err = validateMemberPassword(password);
  if (err) throw new Error(err);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: password.trim(),
  });
  if (error) throw new Error(error.message || "Could not set password");
}

export async function resolveMemberIdByReferralCode(
  code: string,
): Promise<string | null> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", trimmed)
    .maybeSingle();
  return data?.id ?? null;
}
