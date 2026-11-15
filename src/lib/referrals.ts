import { createAdminClient } from "@/lib/supabase/admin";
import { AD_REFERRAL_RATES, REFERRAL_RATES } from "@/lib/plans";
import { walletApply } from "@/lib/wallet";
import { hasActivePaidSubscription } from "@/lib/membership";

type ReferrerChain = { a?: string; b?: string; c?: string };

export async function getReferrerChain(userId: string): Promise<ReferrerChain> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .single();
  if (!profile?.referred_by) return {};

  const a = profile.referred_by;
  const { data: bProfile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", a)
    .maybeSingle();
  const b = bProfile?.referred_by ?? undefined;
  if (!b) return { a };

  const { data: cProfile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", b)
    .maybeSingle();
  const c = cProfile?.referred_by ?? undefined;
  return { a, b, c };
}

type Rates = { a: number; b: number; c: number };

async function payReferrerChain(
  sourceUserId: string,
  baseAmount: number,
  rates: Rates,
  entryType: "referral_upgrade" | "referral_ad",
  referenceId: string,
  extraMeta: Record<string, unknown> = {},
): Promise<void> {
  const chain = await getReferrerChain(sourceUserId);
  const tiers: { id: string; rate: number; level: string }[] = [];
  if (chain.a) tiers.push({ id: chain.a, rate: rates.a, level: "L1" });
  if (chain.b) tiers.push({ id: chain.b, rate: rates.b, level: "L2" });
  if (chain.c) tiers.push({ id: chain.c, rate: rates.c, level: "L3" });

  for (const t of tiers) {
    const reward = Math.round(baseAmount * t.rate * 100) / 100;
    if (reward <= 0) continue;
    // Uplines on Free Trial (or an expired plan) earn nothing from their downlines.
    if (!(await hasActivePaidSubscription(t.id))) continue;
    await walletApply(t.id, "withdrawal", reward, entryType, referenceId, {
      ...extraMeta,
      from_user: sourceUserId,
      level: t.level,
    });
  }
}

export async function distributeReferralRewards(
  buyerId: string,
  baseAmount: number,
  entryType: "referral_upgrade",
  referenceId: string,
): Promise<void> {
  await payReferrerChain(buyerId, baseAmount, REFERRAL_RATES, entryType, referenceId);
}

/**
 * Team ad rewards: when a member is credited for an ad view, their L1–L3
 * uplines each earn a percent of that ad reward. Only viewers on an active
 * paid plan generate this — Free Trial / expired viewers pay nothing upline.
 */
export async function distributeAdReferralRewards(
  viewerId: string,
  adReward: number,
  videoId: string,
  viewDate: string,
): Promise<void> {
  if (adReward <= 0) return;
  if (!(await hasActivePaidSubscription(viewerId))) return;
  await payReferrerChain(
    viewerId,
    adReward,
    AD_REFERRAL_RATES,
    "referral_ad",
    videoId,
    { date: viewDate, ad_reward: adReward },
  );
}

