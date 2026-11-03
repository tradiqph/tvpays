import { createAdminClient } from "@/lib/supabase/admin";
import { clampText } from "@/lib/security/input";

export const SIGNUP_REF_LOCK_STORAGE_KEY = "tvpays_signup_ref_lock";

export const REFERRAL_CODE_INACTIVE_MESSAGE =
  "This referral code is not active yet. Your inviter must be an approved Agent.";

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

export type ReferralCodeSignupStatus = "missing" | "inactive" | "valid";

/** Whether a code can be used for new sign-ups (upline must be an approved Agent). */
export async function referralCodeSignupStatus(
  code: string,
): Promise<ReferralCodeSignupStatus> {
  const normalized = normalizeReferralCodeInput(code);
  if (!normalized) return "missing";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, agent_status")
    .eq("referral_code", normalized)
    .maybeSingle();

  if (error || !data?.id) return "missing";
  if (data.agent_status !== "approved") return "inactive";
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
    return REFERRAL_CODE_INACTIVE_MESSAGE;
  }
  if (lower.includes("invalid_referral_code")) {
    return "That referral code is not valid. Check the code and try again.";
  }
  return err;
}
