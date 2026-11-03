import { createAdminClient } from "@/lib/supabase/admin";
import {
  createStarpagoPayout,
  isDefinitiveStarpagoCreateFailure,
  mapStarpagoPayoutStatus,
  queryStarpagoPayout,
  starpagoPayoutConfigured,
} from "@/lib/starpago-payout";
import { parseStarpagoMemberMethod } from "@/lib/starpago";
import { withdrawalPayoutMerOrderNo } from "@/lib/withdrawals";

type WithdrawalRow = {
  id: string;
  user_id: string;
  gross_amount: number;
  net_amount: number;
  status: string;
  destination_type: string;
  destination_number: string;
  destination_name: string;
  payout_attempt: number;
  starpago_mer_order_no: string | null;
  refund_status: string;
};

async function memberEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: user } = await admin.auth.admin.getUserById(userId);
  return user.user?.email ?? null;
}

async function refundWithdrawal(row: Pick<WithdrawalRow, "id" | "user_id" | "gross_amount">) {
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("withdrawals")
    .select("refund_status")
    .eq("id", row.id)
    .maybeSingle();

  if (current?.refund_status === "completed") return;

  await admin
    .from("withdrawals")
    .update({ refund_status: "pending" })
    .eq("id", row.id)
    .neq("refund_status", "completed");

  const { error: refundErr } = await admin.rpc("wallet_apply", {
    p_user_id: row.user_id,
    p_bucket: "withdrawal",
    p_delta: Number(row.gross_amount),
    p_entry_type: "withdrawal_refund",
    p_reference_id: row.id,
    p_meta: {},
  });
  if (refundErr) throw new Error(`Refund failed: ${refundErr.message}`);

  await admin
    .from("withdrawals")
    .update({ refund_status: "completed" })
    .eq("id", row.id);
}

export async function markWithdrawalFailedAndRefund(
  withdrawalId: string,
  reason: string,
) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("withdrawals")
    .select("id, user_id, gross_amount, net_amount, status, refund_status")
    .eq("id", withdrawalId)
    .maybeSingle();

  if (!row) throw new Error("Withdrawal not found");
  if (row.status === "completed") return;
  if (row.refund_status === "completed") return;

  await admin
    .from("withdrawals")
    .update({
      status: "failed",
      failure_reason: reason,
    })
    .eq("id", withdrawalId);

  await refundWithdrawal(row);
}

export async function dispatchWithdrawalPayout(withdrawalId: string) {
  if (!starpagoPayoutConfigured()) {
    throw new Error("Payout gateway not configured");
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("withdrawals")
    .select("*")
    .eq("id", withdrawalId)
    .maybeSingle();

  if (!row) throw new Error("Withdrawal not found");
  if (row.status !== "pending") {
    throw new Error("Withdrawal is not pending");
  }
  if (!parseStarpagoMemberMethod(row.destination_type)) {
    throw new Error("Only GCash and Maya payouts are supported");
  }

  const attempt = (row.payout_attempt ?? 0) + 1;
  const memberEmailAddress = await memberEmail(row.user_id);

  try {
    const result = await createStarpagoPayout({
      withdrawalId: row.id,
      attempt,
      amountPhp: Number(row.net_amount),
      destinationType: row.destination_type,
      destinationNumber: row.destination_number,
      destinationName: row.destination_name,
      memberEmail: memberEmailAddress,
    });

    const action = mapStarpagoPayoutStatus(result.orderStatus);
    const nextStatus =
      action === "success"
        ? "completed"
        : action === "fail"
          ? "failed"
          : action === "frozen"
            ? "frozen"
            : "processing";

    await admin
      .from("withdrawals")
      .update({
        status: nextStatus,
        payout_attempt: attempt,
        starpago_mer_order_no: result.merOrderNo,
        starpago_order_no: result.orderNo,
        starpago_order_status: result.orderStatus,
        failure_reason:
          action === "fail" || action === "frozen"
            ? result.message ?? "Payout could not be completed"
            : null,
        completed_at: action === "success" ? new Date().toISOString() : null,
        refund_status:
          action === "frozen" || action === "fail" ? "pending" : row.refund_status,
      })
      .eq("id", withdrawalId);

    if (action === "fail") {
      await markWithdrawalFailedAndRefund(
        withdrawalId,
        result.message ?? "Payout failed",
      );
    }

    if (action === "in_progress") {
      try {
        await syncWithdrawal(withdrawalId);
      } catch {
        /* may still be settling at the gateway */
      }
    }

    return {
      merOrderNo: result.merOrderNo,
      orderNo: result.orderNo,
      orderStatus: result.orderStatus,
    };
  } catch (err) {
    if (isDefinitiveStarpagoCreateFailure(err)) {
      const msg =
        err instanceof Error && "apiMsg" in err && typeof err.apiMsg === "string"
          ? err.apiMsg
          : err instanceof Error
            ? err.message
            : "Invalid payout details";
      await markWithdrawalFailedAndRefund(withdrawalId, msg);
      throw err;
    }

    const merOrderNo = withdrawalPayoutMerOrderNo(row.id, attempt);
    try {
      const queried = await queryStarpagoPayout(merOrderNo);
      await admin
        .from("withdrawals")
        .update({
          payout_attempt: attempt,
          starpago_mer_order_no: merOrderNo,
          starpago_order_no: queried.orderNo,
          status: "processing",
        })
        .eq("id", withdrawalId);
      await applyStarpagoPayoutToWithdrawal(
        queried.merOrderNo,
        queried.orderStatus,
        queried.message ?? undefined,
      );
      return queried;
    } catch {
      throw err;
    }
  }
}

export async function applyStarpagoPayoutToWithdrawal(
  merOrderNo: string,
  orderStatus: number,
  message?: string,
) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("withdrawals")
    .select("*")
    .eq("starpago_mer_order_no", merOrderNo)
    .maybeSingle();

  if (!row) return;

  const withdrawal = row;

  if (withdrawal.status === "completed" && mapStarpagoPayoutStatus(orderStatus) === "success") {
    return;
  }

  const action = mapStarpagoPayoutStatus(orderStatus);
  const reason = message?.trim() || withdrawal.failure_reason;

  await admin
    .from("withdrawals")
    .update({
      starpago_order_status: orderStatus,
      failure_reason:
        action === "fail" || action === "frozen" ? reason ?? "Payout issue" : null,
    })
    .eq("id", withdrawal.id);

  if (action === "in_progress") {
    if (withdrawal.status === "pending") {
      await admin
        .from("withdrawals")
        .update({ status: "processing" })
        .eq("id", withdrawal.id);
    }
    return;
  }

  if (action === "success") {
    if (withdrawal.status === "completed") return;
    await admin
      .from("withdrawals")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", withdrawal.id);

    return;
  }

  if (action === "frozen") {
    if (withdrawal.status === "frozen") return;
    await admin
      .from("withdrawals")
      .update({
        status: "frozen",
        refund_status: "pending",
      })
      .eq("id", withdrawal.id);
    return;
  }

  if (withdrawal.status === "failed" && withdrawal.refund_status === "completed") {
    return;
  }

  if (withdrawal.status !== "failed") {
    await admin
      .from("withdrawals")
      .update({ status: "failed" })
      .eq("id", withdrawal.id);
  }

  await markWithdrawalFailedAndRefund(
    withdrawal.id,
    reason ?? "Payout failed",
  );
}

export async function hqPayWithdrawal(withdrawalId: string) {
  return dispatchWithdrawalPayout(withdrawalId);
}

export async function rejectWithdrawal(withdrawalId: string, reason: string) {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("withdrawals")
    .update({ status: "rejected", failure_reason: reason })
    .eq("id", withdrawalId)
    .eq("status", "pending")
    .select("id, user_id, gross_amount, net_amount")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Withdrawal is no longer pending");

  try {
    await refundWithdrawal(row);
  } catch (refundErr) {
    await admin
      .from("withdrawals")
      .update({ status: "pending", failure_reason: null })
      .eq("id", row.id);
    throw refundErr;
  }

  return row;
}

/** Poll StarPago for payouts still pending/processing (e.g. when notify URL is unreachable). */
export async function syncMemberInFlightWithdrawals(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("withdrawals")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["pending", "processing"])
    .not("starpago_mer_order_no", "is", null);

  for (const row of rows ?? []) {
    try {
      await syncWithdrawal(row.id);
    } catch (e) {
      console.warn("[withdraw] member sync failed", row.id, e);
    }
  }
}

export async function syncWithdrawal(withdrawalId: string) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("withdrawals")
    .select("starpago_mer_order_no, status")
    .eq("id", withdrawalId)
    .maybeSingle();

  if (!row?.starpago_mer_order_no) {
    throw new Error("No payout order on this withdrawal");
  }

  const transfer = await queryStarpagoPayout(row.starpago_mer_order_no);
  await applyStarpagoPayoutToWithdrawal(
    transfer.merOrderNo,
    transfer.orderStatus,
    transfer.message ?? undefined,
  );
  return String(transfer.orderStatus);
}

export async function hqResolveFrozenWithdrawal(
  withdrawalId: string,
  outcome: "refund" | "completed",
) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("withdrawals")
    .select("id, user_id, gross_amount, net_amount, status")
    .eq("id", withdrawalId)
    .maybeSingle();

  if (!row) throw new Error("Withdrawal not found");
  if (row.status !== "frozen") {
    throw new Error("Withdrawal is not frozen");
  }

  if (outcome === "completed") {
    await admin
      .from("withdrawals")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        refund_status: "none",
        failure_reason: null,
      })
      .eq("id", withdrawalId);

    return row;
  }

  await markWithdrawalFailedAndRefund(
    withdrawalId,
    "Payout could not be completed — funds returned to your balance",
  );
  return row;
}

/** @deprecated PayMongo callback — kept for historical transfers only */
export async function applyPaymongoTransferToWithdrawal(
  _transferId: string,
  _status: string,
) {
  return;
}
