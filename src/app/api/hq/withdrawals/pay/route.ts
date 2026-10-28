import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isHqUser } from "@/lib/supabase/admin";
import { hqPayWithdrawal } from "@/lib/hq-withdrawals";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isHqUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { withdrawal_id } = (await request.json()) as { withdrawal_id?: string };
  if (!withdrawal_id) {
    return NextResponse.json({ error: "Missing withdrawal_id" }, { status: 400 });
  }

  try {
    const result = await hqPayWithdrawal(withdrawal_id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pay failed" },
      { status: 502 },
    );
  }
}
