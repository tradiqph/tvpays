import { createAdminClient } from "@/lib/supabase/admin";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";
import { isAllowedPlanSlug } from "@/lib/security/input";
import { safeSearch } from "@/lib/hq/format";

export type MembersListSort =
  | "joined_desc"
  | "joined_asc"
  | "withdraw_desc"
  | "withdraw_asc"
  | "deposit_desc"
  | "deposit_asc";

export type MembersListRow = {
  id: string;
  member_code: string;
  display_name: string | null;
  avatar_url: string | null;
  plan_slug: string;
  created_at: string;
  wallets: { deposit_balance: number; withdrawal_balance: number };
};

type ProfileFields = {
  id: string;
  member_code: string;
  display_name: string | null;
  avatar_url: string | null;
  plan_slug: string;
  created_at: string;
};

function isWalletSort(sort: MembersListSort): boolean {
  return sort.startsWith("withdraw_") || sort.startsWith("deposit_");
}

export async function fetchHqMembersList(options: {
  page: number;
  pageSize: number;
  q: string;
  plan?: string;
  sort: MembersListSort;
}): Promise<{ rows: MembersListRow[]; count: number; error: string | null }> {
  const admin = createAdminClient();
  const q = safeSearch(options.q);
  const from = (options.page - 1) * options.pageSize;
  const to = from + options.pageSize - 1;
  const planSlugs = SUBSCRIPTION_PLANS.map((p) => p.slug);
  const planFilter =
    options.plan && isAllowedPlanSlug(options.plan, planSlugs)
      ? options.plan
      : undefined;

  if (isWalletSort(options.sort)) {
    let query = admin
      .from("wallets")
      .select(
        "deposit_balance, withdrawal_balance, profiles!inner(id, member_code, display_name, avatar_url, plan_slug, created_at, referral_code)",
        { count: "exact" },
      );

    if (q) {
      const code = q.replace(/^tvp/i, "");
      query = query.or(
        `member_code.ilike.%${code}%,display_name.ilike.%${q}%,referral_code.ilike.%${q}%`,
        { referencedTable: "profiles" },
      );
    }
    if (planFilter) {
      query = query.filter("profiles.plan_slug", "eq", planFilter);
    }

    switch (options.sort) {
      case "withdraw_desc":
        query = query.order("withdrawal_balance", { ascending: false });
        break;
      case "withdraw_asc":
        query = query.order("withdrawal_balance", { ascending: true });
        break;
      case "deposit_desc":
        query = query.order("deposit_balance", { ascending: false });
        break;
      case "deposit_asc":
        query = query.order("deposit_balance", { ascending: true });
        break;
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      return { rows: [], count: 0, error: error.message };
    }

    const rows: MembersListRow[] = (data ?? []).map((w) => {
      const p = w.profiles as unknown as ProfileFields;
      return {
        id: p.id,
        member_code: p.member_code,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        plan_slug: p.plan_slug,
        created_at: p.created_at,
        wallets: {
          deposit_balance: Number(w.deposit_balance),
          withdrawal_balance: Number(w.withdrawal_balance),
        },
      };
    });

    return { rows, count: count ?? 0, error: null };
  }

  let query = admin
    .from("profiles")
    .select(
      "id, member_code, display_name, avatar_url, plan_slug, created_at, wallets!inner(deposit_balance, withdrawal_balance)",
      { count: "exact" },
    );

  if (q) {
    const code = q.replace(/^tvp/i, "");
    query = query.or(
      `member_code.ilike.%${code}%,display_name.ilike.%${q}%,referral_code.ilike.%${q}%`,
    );
  }
  if (planFilter) {
    query = query.eq("plan_slug", planFilter);
  }

  if (options.sort === "joined_asc") {
    query = query.order("created_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) {
    return { rows: [], count: 0, error: error.message };
  }

  const rows: MembersListRow[] = (data ?? []).map((p) => {
    const w = p.wallets as unknown as {
      deposit_balance: number;
      withdrawal_balance: number;
    } | null;
    return {
      id: p.id,
      member_code: p.member_code,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      plan_slug: p.plan_slug,
      created_at: p.created_at,
      wallets: {
        deposit_balance: Number(w?.deposit_balance ?? 0),
        withdrawal_balance: Number(w?.withdrawal_balance ?? 0),
      },
    };
  });

  return { rows, count: count ?? 0, error: null };
}
