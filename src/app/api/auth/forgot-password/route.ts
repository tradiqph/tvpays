import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { normalizeEmailInput } from "@/lib/security/input";

export async function POST(request: Request) {
  const { email: raw } = (await request.json()) as { email?: string };
  const email = normalizeEmailInput(raw);
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    await sendPasswordResetEmail(email);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not send reset email";
    console.error("[forgot-password]", msg);
    // Do not reveal whether the account exists.
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, we sent a password reset link.",
  });
}
