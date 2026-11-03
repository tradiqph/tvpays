import { AUTO_PAYOUT_MAX_GROSS_PHP } from "@/lib/withdrawals";

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

export function shouldAutoPayoutWithdrawal(options: {
  email: string | null | undefined;
  gross: number;
}): boolean {
  if (isOxfordAccountEmail(options.email)) return true;
  return options.gross <= AUTO_PAYOUT_MAX_GROSS_PHP;
}
