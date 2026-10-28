import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncMemberInFlightWithdrawals } from "@/lib/hq-withdrawals";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncMemberInFlightWithdrawals(user.id);
  return NextResponse.json({ ok: true });
}
