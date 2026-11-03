import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMemberStarpagoDeposit } from "@/lib/starpago-deposit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return createMemberStarpagoDeposit(user, body);
}
