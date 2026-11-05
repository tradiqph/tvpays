import { createAdminClient } from "@/lib/supabase/admin";
import { clampText } from "@/lib/security/input";

export const SIGNUP_REF_LOCK_STORAGE_KEY = "tvpays_signup_ref_lock";

const REFERRAL_CODE_MAX = 32;

export function normalizeReferralCodeInput(raw: string): string {
  return clampText(raw, REFERRAL_CODE_MAX).trim().toUpperCase();
}

export function referralCodeFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): string {
  const fromUrl =
    params.get("ref") ?? params.get("referral") ?? "";
  return normalizeReferralCodeInput(fromUrl);
}

export type ReferralCodeSignupStatus = "missing" | "valid";

/** Whether a code belongs to an existing member (any member may refer). */
export async function referralCodeSignupStatus(
  code: string,
): Promise<ReferralCodeSignupStatus> {
  const normalized = normalizeReferralCodeInput(code);
  if (!normalized) return "missing";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", normalized)
    .maybeSingle();

  if (error || !data?.id) return "missing";
  return "valid";
}

/** Returns true when the code is valid for sign-up. */
export async function referralCodeExists(code: string): Promise<boolean> {
  return (await referralCodeSignupStatus(code)) === "valid";
}

export function signupReferralErrorMessage(err: string): string {
  const lower = err.toLowerCase();
  if (lower.includes("referral_required")) {
    return "A referral code is required to create an account.";
  }
  if (
    lower.includes("referral_code_not_active") ||
    lower.includes("referral_code_inactive")
  ) {
    return "That referral code is not valid. Check the code and try again.";
  }
  if (lower.includes("invalid_referral_code")) {
    return "That referral code is not valid. Check the code and try again.";
  }
  return err;
}
