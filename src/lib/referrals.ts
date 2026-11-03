import { createAdminClient } from "@/lib/supabase/admin";
import { REFERRAL_RATES, AGENT_DIRECT_SALE_RATE } from "@/lib/plans";
import { walletApply } from "@/lib/wallet";

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

export async function distributeReferralRewards(
  buyerId: string,
  baseAmount: number,
  entryType: "referral_upgrade",
  referenceId: string,
): Promise<void> {
  const chain = await getReferrerChain(buyerId);
  const tiers: { id: string; rate: number; level: string }[] = [];
  if (chain.a) tiers.push({ id: chain.a, rate: REFERRAL_RATES.a, level: "L1" });
  if (chain.b) tiers.push({ id: chain.b, rate: REFERRAL_RATES.b, level: "L2" });
  if (chain.c) tiers.push({ id: chain.c, rate: REFERRAL_RATES.c, level: "L3" });

  for (const t of tiers) {
    const reward = Math.round(baseAmount * t.rate * 100) / 100;
    if (reward <= 0) continue;
    await walletApply(t.id, "withdrawal", reward, entryType, referenceId, {
      from_user: buyerId,
      level: t.level,
    });
  }
}

export async function maybeAgentDirectSaleBonus(
  buyerId: string,
  planPrice: number,
  referenceId: string,
): Promise<void> {
  const chain = await getReferrerChain(buyerId);
  if (!chain.a) return;

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("profiles")
    .select("agent_status")
    .eq("id", chain.a)
    .maybeSingle();

  if (agent?.agent_status !== "approved") return;

  const bonus = Math.round(planPrice * AGENT_DIRECT_SALE_RATE * 100) / 100;
  if (bonus <= 0) return;

  await walletApply(chain.a, "withdrawal", bonus, "agent_sale", referenceId, {
    buyer: buyerId,
  });
}
