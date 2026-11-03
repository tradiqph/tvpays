import { createAdminClient } from "@/lib/supabase/admin";
import { getWallet, type WalletBucket } from "@/lib/wallet";

export type WalletTransferDirection =
  | "deposit_to_withdrawal"
  | "withdrawal_to_deposit";

const MIN_TRANSFER_PHP = 1;

function bucketsForDirection(
  direction: WalletTransferDirection,
): { from: WalletBucket; to: WalletBucket } {
  if (direction === "deposit_to_withdrawal") {
    return { from: "deposit", to: "withdrawal" };
  }
  return { from: "withdrawal", to: "deposit" };
}

export async function memberTransferWallet(
  userId: string,
  direction: WalletTransferDirection,
  amount: number,
): Promise<{ deposit: number; withdrawal: number }> {
  if (!Number.isFinite(amount) || amount < MIN_TRANSFER_PHP) {
    throw new Error("invalid_amount");
  }

  const { from, to } = bucketsForDirection(direction);
  const wallet = await getWallet(userId);
  const source = from === "deposit" ? wallet.deposit : wallet.withdrawal;
  if (source < amount) {
    throw new Error("insufficient_balance");
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("wallet_transfer_internal", {
    p_user_id: userId,
    p_from: from,
    p_to: to,
    p_amount: amount,
  });
  if (error) throw new Error(error.message);

  return getWallet(userId);
}
