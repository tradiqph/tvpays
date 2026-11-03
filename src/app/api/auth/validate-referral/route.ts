import { NextResponse } from "next/server";
import {
  normalizeReferralCodeInput,
  REFERRAL_CODE_INACTIVE_MESSAGE,
  referralCodeSignupStatus,
} from "@/lib/referral-signup";

/** Public check used before sign-up (does not reveal member identity). */
export async function POST(request: Request) {
  const body = (await request.json()) as { code?: string };
  const code = normalizeReferralCodeInput(body.code ?? "");
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Referral code is required." },
      { status: 400 },
    );
  }

  const status = await referralCodeSignupStatus(code);
  if (status === "missing") {
    return NextResponse.json(
      { ok: false, error: "Invalid referral code." },
      { status: 404 },
    );
  }
  if (status === "inactive") {
    return NextResponse.json(
      { ok: false, error: REFERRAL_CODE_INACTIVE_MESSAGE },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
