import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPaymongoPayout,
  fetchPaymongoTransfer,
  paymongoWalletConfigured,
} from "@/lib/paymongo-payout";
import { emailPayoutResult } from "@/lib/email";

export async function hqPayWithdrawal(withdrawalId: string) {
  if (!paymongoWalletConfigured()) {
    throw new Error("PayMongo wallet not configured");
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

  const attempt = (row.payout_attempt ?? 0) + 1;
  const { transferId } = await createPaymongoPayout({
    withdrawalId: row.id,
    attempt,
    amountPhp: Number(row.net_amount),
    destinationNumber: row.destination_number,
    destinationName: row.destination_name,
    destinationBic: row.destination_bic || "PAEYPHM2XXX",
  });

  await admin
    .from("withdrawals")
    .update({
      status: "processing",
      paymongo_transfer_id: transferId,
      payout_attempt: attempt,
    })
    .eq("id", withdrawalId);

  return { transferId };
}

export async function applyPaymongoTransferToWithdrawal(
  transferId: string,
  status: string,
) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("withdrawals")
    .select("*")
    .eq("paymongo_transfer_id", transferId)
    .maybeSingle();

  if (!row) return;

  if (status === "succeeded") {
    await admin
      .from("withdrawals")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    const { data: user } = await admin.auth.admin.getUserById(row.user_id);
    if (user.user?.email) {
      await emailPayoutResult(user.user.email, true, Number(row.net_amount));
    }
  } else if (status === "failed") {
    await admin
      .from("withdrawals")
      .update({
        status: "failed",
        failure_reason: "PayMongo transfer failed",
      })
      .eq("id", row.id);

    await admin.rpc("wallet_apply", {
      p_user_id: row.user_id,
      p_bucket: "withdrawal",
      p_delta: Number(row.gross_amount),
      p_entry_type: "withdrawal_refund",
      p_reference_id: row.id,
      p_meta: {},
    });

    const { data: user } = await admin.auth.admin.getUserById(row.user_id);
    if (user.user?.email) {
      await emailPayoutResult(user.user.email, false, Number(row.net_amount));
    }
  }
}

export async function syncWithdrawal(withdrawalId: string) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("withdrawals")
    .select("paymongo_transfer_id, status")
    .eq("id", withdrawalId)
    .maybeSingle();

  if (!row?.paymongo_transfer_id) {
    throw new Error("No PayMongo transfer on this withdrawal");
  }

  const transfer = await fetchPaymongoTransfer(row.paymongo_transfer_id);
  await applyPaymongoTransferToWithdrawal(transfer.transferId, transfer.status);
  return transfer.status;
}
