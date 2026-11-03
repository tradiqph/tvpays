import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import { hqPayWithdrawal } from "@/lib/hq-withdrawals";
import { isUuid } from "@/lib/security/input";

export async function POST(request: Request) {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { withdrawal_id } = (await request.json()) as { withdrawal_id?: string };
  if (!withdrawal_id || !isUuid(withdrawal_id)) {
    return NextResponse.json({ error: "Missing withdrawal_id" }, { status: 400 });
  }

  try {
    const result = await hqPayWithdrawal(withdrawal_id);
    await logHqAction(session.user, "withdrawal.pay", { type: "withdrawal", id: withdrawal_id }, result);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pay failed" },
      { status: 502 },
    );
  }
}
