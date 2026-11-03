import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** OAuth / magic-link / recovery code exchange for SSR cookies. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/wallet";
  const next = nextRaw.startsWith("/") ? nextRaw : "/wallet";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
