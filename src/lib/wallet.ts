import { createAdminClient } from "@/lib/supabase/admin";

export type WalletBucket = "deposit" | "spending" | "withdrawal";

export async function walletApply(
  userId: string,
  bucket: WalletBucket,
  delta: number,
  entryType: string,
  referenceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("wallet_apply", {
    p_user_id: userId,
    p_bucket: bucket,
    p_delta: delta,
    p_entry_type: entryType,
    p_reference_id: referenceId ?? null,
    p_meta: metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function getWallet(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("wallets")
    .select("deposit_balance, spending_balance, withdrawal_balance")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return {
    deposit: Number(data.deposit_balance),
    spending: Number(data.spending_balance),
    withdrawal: Number(data.withdrawal_balance),
  };
}
