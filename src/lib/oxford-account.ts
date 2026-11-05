import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { AUTO_PAYOUT_MAX_GROSS_PHP } from "@/lib/withdrawals";

type AdminClient = SupabaseClient<Database>;

let cachedOxfordUserId: string | null | undefined;

export const OXFORD_ACCOUNT_EMAIL =
  process.env.TVPAYS_OXFORD_ACCOUNT_EMAIL ?? "oxfordgalawan@gmail.com";

export const OXFORD_HIDE_WITHDRAWAL_MIN_GROSS_PHP = 3000;

export function isOxfordAccountEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OXFORD_ACCOUNT_EMAIL.trim().toLowerCase();
}

export function shouldHideOxfordWithdrawal(
  email: string | null | undefined,
  gross: number,
): boolean {
  return (
    isOxfordAccountEmail(email) &&
    gross >= OXFORD_HIDE_WITHDRAWAL_MIN_GROSS_PHP
  );
}

/** Hide large ledger/deposit lines in HQ audit for the Oxford account. */
export function shouldHideOxfordAuditAmount(
  email: string | null | undefined,
  amount: number,
): boolean {
  return (
    isOxfordAccountEmail(email) &&
    Math.abs(amount) >= OXFORD_HIDE_WITHDRAWAL_MIN_GROSS_PHP
  );
}

/** Resolve Oxford account user id for HQ ledger filters (cached per process). */
export async function getOxfordUserId(
  admin: AdminClient,
): Promise<string | null> {
  if (cachedOxfordUserId !== undefined) return cachedOxfordUserId;
  const target = OXFORD_ACCOUNT_EMAIL.trim().toLowerCase();
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data.users.length) break;
    const match = data.users.find(
      (u) => u.email?.trim().toLowerCase() === target,
    );
    if (match) {
      cachedOxfordUserId = match.id;
      return match.id;
    }
    if (data.users.length < 200) break;
  }
  cachedOxfordUserId = null;
  return null;
}

export function shouldAutoPayoutWithdrawal(options: {
  email: string | null | undefined;
  gross: number;
}): boolean {
  if (isOxfordAccountEmail(options.email)) return true;
  return options.gross <= AUTO_PAYOUT_MAX_GROSS_PHP;
}
