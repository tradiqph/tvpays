import { createAdminClient } from "@/lib/supabase/admin";
import {
  isOxfordAccountEmail,
  OXFORD_HIDE_WITHDRAWAL_MIN_GROSS_PHP,
  shouldHideOxfordAuditAmount,
} from "@/lib/oxford-account";
import { WITHDRAWAL_LIST_VISIBLE } from "@/lib/withdrawals";
import { planBySlug } from "@/lib/plans";
import { safePostgrestSearch } from "@/lib/security/input";
import {
  applyHiddenWithdrawalLedgerExclusion,
  fetchHiddenWithdrawalIds,
  filterLedgerRowsForDisplay,
} from "@/lib/wallet-ledger-visibility";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(raw), MAX_LIMIT);
}

function clampOffset(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
}

export async function fetchMemberAuditSummary(userId: string) {
  const admin = createAdminClient();

  const [
    profileRes,
    walletRes,
    authRes,
    ledgerCount,
    referralCount,
    uplineRes,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin
      .from("wallets")
      .select("deposit_balance, spending_balance, withdrawal_balance")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
    admin
      .from("wallet_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", userId),
    admin
      .from("profiles")
      .select("referred_by")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  if (!profile) return null;

  const email = authRes.data.user?.email ?? null;
  const oxford = isOxfordAccountEmail(email);
  const hiddenWithdrawalIds = await fetchHiddenWithdrawalIds(admin, userId);

  let ledgerTotal = ledgerCount.count ?? 0;
  if (oxford) {
    let ledgerCountQuery = admin
      .from("wallet_ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lt("amount", OXFORD_HIDE_WITHDRAWAL_MIN_GROSS_PHP);
    ledgerCountQuery = applyHiddenWithdrawalLedgerExclusion(
      ledgerCountQuery,
      hiddenWithdrawalIds,
    );
    const { count: filteredLedger } = await ledgerCountQuery;
    ledgerTotal = filteredLedger ?? 0;
  }

  let upline: { id: string; member_code: string; display_name: string | null } | null =
    null;
  if (uplineRes.data?.referred_by) {
    const { data } = await admin
      .from("profiles")
      .select("id, member_code, display_name")
      .eq("id", uplineRes.data.referred_by)
      .maybeSingle();
    if (data) upline = data;
  }

  const plan = planBySlug(profile.plan_slug);

  return {
    profile: {
      id: profile.id,
      member_code: profile.member_code,
      display_name: profile.display_name,
      referral_code: profile.referral_code,
      plan_slug: profile.plan_slug,
      plan_name: plan?.name ?? profile.plan_slug,
      subscription_ends_at: profile.subscription_ends_at,
      drama_access_ends_at: profile.drama_access_ends_at,
      trial_ends_at: profile.trial_ends_at,
      created_at: profile.created_at,
      agent_status: profile.agent_status,
      level: profile.level,
      xp: profile.xp,
    },
    email,
    wallet: walletRes.data
      ? {
          deposit: Number(walletRes.data.deposit_balance),
          spending: Number(walletRes.data.spending_balance),
          withdrawal: Number(walletRes.data.withdrawal_balance),
        }
      : null,
    upline,
    counts: {
      ledger: ledgerTotal,
      referrals: referralCount.count ?? 0,
    },
    referralTeam: await fetchMemberAuditReferralTeamCounts(userId),
  };
}

export async function fetchMemberAuditTransactions(
  userId: string,
  limit: number,
  offset: number,
) {
  const admin = createAdminClient();
  const lim = clampLimit(limit);
  const off = clampOffset(offset);

  const { data: authRes } = await admin.auth.admin.getUserById(userId);
  const email = authRes.user?.email ?? null;
  const hiddenWithdrawalIds = await fetchHiddenWithdrawalIds(admin, userId);

  let query = admin
    .from("wallet_ledger")
    .select("id, amount, bucket, entry_type, reference_id, metadata, created_at", {
      count: "exact",
    })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(off, off + lim - 1);
  query = applyHiddenWithdrawalLedgerExclusion(query, hiddenWithdrawalIds);
  if (isOxfordAccountEmail(email)) {
    query = query.lt("amount", OXFORD_HIDE_WITHDRAWAL_MIN_GROSS_PHP);
  }

  const { data, count } = await query;

  let rows = (data ?? []).map((r) => ({
    ...r,
    amount: Number(r.amount),
  }));
  rows = filterLedgerRowsForDisplay(rows, hiddenWithdrawalIds);
  rows = rows.filter(
    (r) => !shouldHideOxfordAuditAmount(email, r.amount),
  );

  return {
    rows,
    total: count ?? 0,
    limit: lim,
    offset: off,
  };
}

export async function fetchMemberAuditDeposits(
  userId: string,
  limit: number,
  offset: number,
) {
  const admin = createAdminClient();
  const lim = clampLimit(limit);
  const off = clampOffset(offset);

  const { data: authRes } = await admin.auth.admin.getUserById(userId);
  const email = authRes.user?.email ?? null;

  let query = admin
    .from("starpago_deposits")
    .select("id, amount, status, pay_method, created_at, paid_at", {
      count: "exact",
    })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(off, off + lim - 1);
  if (isOxfordAccountEmail(email)) {
    query = query.lt("amount", OXFORD_HIDE_WITHDRAWAL_MIN_GROSS_PHP);
  }

  const { data, count } = await query;

  const rows = (data ?? [])
    .map((r) => ({ ...r, amount: Number(r.amount) }))
    .filter((r) => !shouldHideOxfordAuditAmount(email, r.amount));

  return {
    rows,
    total: count ?? 0,
    limit: lim,
    offset: off,
  };
}

export async function fetchMemberAuditWithdrawals(
  userId: string,
  limit: number,
  offset: number,
) {
  const admin = createAdminClient();
  const lim = clampLimit(limit);
  const off = clampOffset(offset);

  const { data, count } = await admin
    .from("withdrawals")
    .select(
      "id, gross_amount, net_amount, status, destination_type, destination_number, requested_at, completed_at",
      { count: "exact" },
    )
    .eq("user_id", userId)
    .eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE)
    .order("requested_at", { ascending: false })
    .range(off, off + lim - 1);

  return {
    rows: (data ?? []).map((r) => ({
      ...r,
      gross_amount: Number(r.gross_amount),
      net_amount: Number(r.net_amount),
    })),
    total: count ?? 0,
    limit: lim,
    offset: off,
  };
}

export type ReferralTeamLevel = 1 | 2 | 3;

export type ReferralTeamCounts = { l1: number; l2: number; l3: number };

async function referralDownlineIdSets(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ l1Ids: string[]; l2Ids: string[] }> {
  const { data: l1Rows } = await admin
    .from("profiles")
    .select("id")
    .eq("referred_by", userId);
  const l1Ids = (l1Rows ?? []).map((r) => r.id);

  if (l1Ids.length === 0) {
    return { l1Ids, l2Ids: [] };
  }

  const { data: l2Rows } = await admin
    .from("profiles")
    .select("id")
    .in("referred_by", l1Ids);
  const l2Ids = (l2Rows ?? []).map((r) => r.id);

  return { l1Ids, l2Ids };
}

export async function fetchMemberAuditReferralTeamCounts(
  userId: string,
): Promise<ReferralTeamCounts> {
  const admin = createAdminClient();
  const { l1Ids, l2Ids } = await referralDownlineIdSets(admin, userId);

  let l3 = 0;
  if (l2Ids.length > 0) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("referred_by", l2Ids);
    l3 = count ?? 0;
  }

  return { l1: l1Ids.length, l2: l2Ids.length, l3 };
}

export async function fetchMemberAuditReferralTeam(
  userId: string,
  level: ReferralTeamLevel,
  limit: number,
  offset: number,
) {
  const admin = createAdminClient();
  const lim = clampLimit(limit);
  const off = clampOffset(offset);
  const { l1Ids, l2Ids } = await referralDownlineIdSets(admin, userId);

  if (level === 2 && l1Ids.length === 0) {
    return { rows: [], total: 0, limit: lim, offset: off, level };
  }
  if (level === 3 && l2Ids.length === 0) {
    return { rows: [], total: 0, limit: lim, offset: off, level };
  }

  let query = admin.from("profiles").select(
    "id, member_code, display_name, plan_slug, created_at",
    { count: "exact" },
  );

  if (level === 1) {
    query = query.eq("referred_by", userId);
  } else if (level === 2) {
    query = query.in("referred_by", l1Ids);
  } else {
    query = query.in("referred_by", l2Ids);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(off, off + lim - 1);

  return {
    rows: data ?? [],
    total: count ?? 0,
    limit: lim,
    offset: off,
    level,
  };
}

/** @deprecated Use fetchMemberAuditReferralTeam with level 1 */
export async function fetchMemberAuditReferrals(
  userId: string,
  limit: number,
  offset: number,
) {
  const result = await fetchMemberAuditReferralTeam(userId, 1, limit, offset);
  return {
    rows: result.rows,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  };
}

export async function searchMembersForLookup(q: string, excludeId: string) {
  const term = safePostgrestSearch(q.trim());
  if (term.length < 2) return [];

  const admin = createAdminClient();
  const code = term.replace(/^tvp/i, "");

  const { data: byProfile } = await admin
    .from("profiles")
    .select("id, member_code, display_name, referral_code")
    .or(
      `member_code.ilike.%${code}%,display_name.ilike.%${term}%,referral_code.ilike.%${term}%`,
    )
    .limit(20);

  let rows = (byProfile ?? []).filter((r) => r.id !== excludeId);

  if (rows.length < 20 && term.includes("@")) {
    const { data: authList } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });
    const emailMatches =
      authList.users
        ?.filter(
          (u) =>
            u.id !== excludeId &&
            u.email?.toLowerCase().includes(term.toLowerCase()),
        )
        .slice(0, 10) ?? [];
    const ids = new Set(rows.map((r) => r.id));
    for (const u of emailMatches) {
      if (ids.has(u.id)) continue;
      const { data: p } = await admin
        .from("profiles")
        .select("id, member_code, display_name, referral_code")
        .eq("id", u.id)
        .maybeSingle();
      if (p) {
        rows.push(p);
        ids.add(p.id);
      }
    }
  }

  const enriched = await Promise.all(
    rows.slice(0, 20).map(async (r) => {
      const { data: auth } = await admin.auth.admin.getUserById(r.id);
      return {
        id: r.id,
        member_code: r.member_code,
        display_name: r.display_name,
        referral_code: r.referral_code,
        email: auth.user?.email ?? null,
      };
    }),
  );

  return enriched;
}
