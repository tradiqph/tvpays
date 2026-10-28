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

/** Returns true when the code matches an existing member's referral_code. */
export async function referralCodeExists(code: string): Promise<boolean> {
  const normalized = normalizeReferralCodeInput(code);
  if (!normalized) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", normalized)
    .maybeSingle();

  if (error) return false;
  return Boolean(data?.id);
}

export function signupReferralErrorMessage(err: string): string {
  const lower = err.toLowerCase();
  if (lower.includes("referral_required")) {
    return "A referral code is required to create an account.";
  }
  if (lower.includes("invalid_referral_code")) {
    return "That referral code is not valid. Check the code and try again.";
  }
  return err;
}
