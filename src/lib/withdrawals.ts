/** Gross amount (before tax) — auto-send payout without HQ approval. */
export const AUTO_PAYOUT_MAX_GROSS_PHP = 300;

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
