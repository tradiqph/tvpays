import { appOrigin, createAdminClient } from "@/lib/supabase/admin";
import { REFERRAL_LEVELS } from "@/lib/plans";

const L1_LIST_LIMIT = 50;
const RECENT_COMMISSIONS_LIMIT = 20;

export type ReferralTeamMember = {
  memberCode: string;
  displayName: string | null;
  planSlug: string;
  joinedAt: string;
};

export type ReferralCommissionRow = {
  id: string;
  amount: number;
  level: string | null;
  createdAt: string;
  referenceId: string | null;
};

export type MemberReferralsPayload = {
  referralCode: string;
  inviteUrl: string;
  rates: typeof REFERRAL_LEVELS;
  teamCounts: { l1: number; l2: number; l3: number };
  earningsByLevel: { L1: number; L2: number; L3: number };
  totalEarnings: number;
  l1Team: ReferralTeamMember[];
  recentCommissions: ReferralCommissionRow[];
};

function levelFromMetadata(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const level = (meta as { level?: unknown }).level;
  if (typeof level !== "string") return null;
  if (level === "A") return "L1";
  if (level === "B") return "L2";
  if (level === "C") return "L3";
  if (level === "L1" || level === "L2" || level === "L3") return level;
  return level;
}

export async function getMemberReferrals(
  userId: string,
): Promise<MemberReferralsPayload> {
  const admin = createAdminClient();

  const { data: me } = await admin
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .single();

  const referralCode = me?.referral_code ?? "";
  const inviteUrl = `${appOrigin()}/signup?ref=${encodeURIComponent(referralCode)}`;

  const { data: l1All } = await admin
    .from("profiles")
    .select("id")
    .eq("referred_by", userId);

  const l1Ids = (l1All ?? []).map((r) => r.id);
  const l1Count = l1Ids.length;

  let l2Ids: string[] = [];
  let l2Count = 0;
  if (l1Ids.length > 0) {
    const { data: l2All } = await admin
      .from("profiles")
      .select("id")
      .in("referred_by", l1Ids);
    l2Ids = (l2All ?? []).map((r) => r.id);
    l2Count = l2Ids.length;
  }

  let l3Count = 0;
  if (l2Ids.length > 0) {
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .in("referred_by", l2Ids);
    l3Count = count ?? 0;
  }

  const { data: l1List } = await admin
    .from("profiles")
    .select("member_code, display_name, plan_slug, created_at")
    .eq("referred_by", userId)
    .order("created_at", { ascending: false })
    .limit(L1_LIST_LIMIT);

  const l1Team: ReferralTeamMember[] = (l1List ?? []).map((row) => ({
    memberCode: row.member_code,
    displayName: row.display_name,
    planSlug: row.plan_slug,
    joinedAt: row.created_at,
  }));

  const { data: ledgerRows } = await admin
    .from("wallet_ledger")
    .select("id, amount, metadata, created_at, reference_id")
    .eq("user_id", userId)
    .eq("bucket", "withdrawal")
    .eq("entry_type", "referral_upgrade")
    .order("created_at", { ascending: false })
    .limit(RECENT_COMMISSIONS_LIMIT);

  const earningsByLevel = { L1: 0, L2: 0, L3: 0 };
  let totalEarnings = 0;

  const { data: allCommissionRows } = await admin
    .from("wallet_ledger")
    .select("amount, metadata")
    .eq("user_id", userId)
    .eq("bucket", "withdrawal")
    .eq("entry_type", "referral_upgrade");

  for (const row of allCommissionRows ?? []) {
    const amt = Number(row.amount);
    if (amt <= 0) continue;
    totalEarnings += amt;
    const level = levelFromMetadata(row.metadata);
    if (level === "L1") earningsByLevel.L1 += amt;
    else if (level === "L2") earningsByLevel.L2 += amt;
    else if (level === "L3") earningsByLevel.L3 += amt;
  }

  totalEarnings = Math.round(totalEarnings * 100) / 100;
  earningsByLevel.L1 = Math.round(earningsByLevel.L1 * 100) / 100;
  earningsByLevel.L2 = Math.round(earningsByLevel.L2 * 100) / 100;
  earningsByLevel.L3 = Math.round(earningsByLevel.L3 * 100) / 100;

  const recentCommissions: ReferralCommissionRow[] = (ledgerRows ?? []).map(
    (row) => ({
      id: row.id,
      amount: Number(row.amount),
      level: levelFromMetadata(row.metadata),
      createdAt: row.created_at,
      referenceId: row.reference_id,
    }),
  );

  return {
    referralCode,
    inviteUrl,
    rates: REFERRAL_LEVELS,
    teamCounts: { l1: l1Count, l2: l2Count, l3: l3Count },
    earningsByLevel,
    totalEarnings,
    l1Team,
    recentCommissions,
  };
}
