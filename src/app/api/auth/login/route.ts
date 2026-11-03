import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTurnstileConfigured, verifyTurnstileToken } from "@/lib/turnstile";
import { clampText, normalizeEmailInput } from "@/lib/security/input";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    turnstileToken?: string;
  };

  const email = normalizeEmailInput(body.email);
  const password = clampText(body.password, 128);
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  if (isTurnstileConfigured()) {
    const token = body.turnstileToken?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "Complete the security check before signing in." },
        { status: 400 },
      );
    }
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const check = await verifyTurnstileToken(token, ip);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 403 });
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
