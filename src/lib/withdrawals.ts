import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { manilaDayRequestBounds } from "@/lib/manila-date";
import { WITHDRAWAL_TAX_RATE } from "@/lib/plans";

/** Gross amount (before tax) — auto-send payout without HQ approval. */
export const AUTO_PAYOUT_MAX_GROSS_PHP = 300;

/** Max withdrawal requests per member per Manila calendar day. */
export const MAX_MEMBER_WITHDRAWALS_PER_DAY = 3;

export const WITHDRAWAL_DAILY_LIMIT_MESSAGE = `You can only request ${MAX_MEMBER_WITHDRAWALS_PER_DAY} withdrawals per day (Manila time). Try again tomorrow.`;

export async function countMemberWithdrawalsToday(
  admin: SupabaseClient<Database>,
  userId: string,
  now = new Date(),
): Promise<number> {
  const { startIso, endExclusiveIso } = manilaDayRequestBounds(now);
  const { count, error } = await admin
    .from("withdrawals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("requested_at", startIso)
    .lt("requested_at", endExclusiveIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function isSuperAdminRole(role: unknown): boolean {
  return role === "super_admin";
}

/** Filter for member/HQ withdrawal lists (hidden rows remain in DB for audit). */
export const WITHDRAWAL_LIST_VISIBLE = false;

export function applyWithdrawalListVisibility<
  Q extends { eq: (column: string, value: boolean) => Q },
>(query: Q): Q {
  return query.eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE);
}

/** Hide Oxford account rows on HQ Completed (and All) withdrawal lists. */
export function applyHqWithdrawalsHideOxfordCompleted<
  Q extends {
    neq: (column: string, value: string) => Q;
    or: (filters: string) => Q;
  },
>(query: Q, oxfordUserId: string | null, status: string): Q {
  if (!oxfordUserId) return query;
  if (status === "completed") {
    return query.neq("user_id", oxfordUserId);
  }
  if (status === "all") {
    return query.or(`status.neq.completed,user_id.neq.${oxfordUserId}`);
  }
  return query;
}

export function computeWithdrawalTaxAndNet(
  gross: number,
  options?: { taxExempt?: boolean },
): { tax: number; net: number } {
  const taxExempt = options?.taxExempt ?? false;
  const tax = taxExempt
    ? 0
    : Math.round(gross * WITHDRAWAL_TAX_RATE * 100) / 100;
  const net = Math.round((gross - tax) * 100) / 100;
  return { tax, net };
}

export const WITHDRAWAL_PAYOUT_MER_PREFIX = "TVPWD";

export function isWithdrawalPayoutMerOrderNo(merOrderNo: string): boolean {
  return merOrderNo.startsWith(WITHDRAWAL_PAYOUT_MER_PREFIX);
}

export function withdrawalPayoutMerOrderNo(
  withdrawalId: string,
  attempt: number,
): string {
  const compact = withdrawalId.replace(/-/g, "").slice(0, 20);
  return `${WITHDRAWAL_PAYOUT_MER_PREFIX}${compact}A${attempt}`.slice(0, 32);
}

export type MemberWithdrawalDisplayStatus =
  | "pending"
  | "sent"
  | "failed"
  | "failed_refund_pending";

export function memberWithdrawalDisplayStatus(row: {
  status: string;
  refund_status: string;
}): MemberWithdrawalDisplayStatus {
  if (row.status === "completed") return "sent";
  if (row.status === "pending" || row.status === "processing") return "pending";
  if (row.status === "frozen") return "failed_refund_pending";
  if (row.status === "failed" || row.status === "rejected") {
    return row.refund_status === "completed" ? "failed" : "failed_refund_pending";
  }
  return "pending";
}

export function memberWithdrawalStatusLabel(
  display: MemberWithdrawalDisplayStatus,
): { title: string; subtitle?: string } {
  switch (display) {
    case "pending":
      return { title: "Pending" };
    case "sent":
      return { title: "Completed" };
    case "failed":
      return { title: "Failed" };
    case "failed_refund_pending":
      return { title: "Failed", subtitle: "Refund pending" };
  }
}
