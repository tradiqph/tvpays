import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const WITHDRAWAL_LEDGER_TYPES = new Set([
  "withdrawal_request",
  "withdrawal_refund",
]);

type AdminClient = SupabaseClient<Database>;

export async function fetchHiddenWithdrawalIds(
  admin: AdminClient,
  userId?: string,
): Promise<Set<string>> {
  let query = admin
    .from("withdrawals")
    .select("id")
    .eq("hidden_from_history", true);
  if (userId) query = query.eq("user_id", userId);

  const { data } = await query.limit(10000);
  return new Set((data ?? []).map((r) => r.id));
}

export function filterLedgerRowsForDisplay<
  T extends {
    entry_type: string;
    reference_id: string | null;
  },
>(rows: T[], hiddenWithdrawalIds: Set<string>): T[] {
  if (hiddenWithdrawalIds.size === 0) return rows;
  return rows.filter((row) => {
    if (!WITHDRAWAL_LEDGER_TYPES.has(row.entry_type)) return true;
    if (!row.reference_id) return true;
    return !hiddenWithdrawalIds.has(row.reference_id);
  });
}

/** Exclude ledger rows tied to hidden withdrawals (PostgREST `not.in`). */
export function applyHiddenWithdrawalLedgerExclusion<
  Q extends {
    not: (
      column: string,
      operator: string,
      value: string,
    ) => Q;
  },
>(query: Q, hiddenWithdrawalIds: Set<string>): Q {
  if (hiddenWithdrawalIds.size === 0) return query;
  const list = [...hiddenWithdrawalIds].join(",");
  return query.not("reference_id", "in", `(${list})`);
}
