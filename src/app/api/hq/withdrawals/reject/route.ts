import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import { rejectWithdrawal } from "@/lib/hq-withdrawals";
import { clampText, isUuid } from "@/lib/security/input";

export async function POST(request: Request) {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { withdrawal_id, reason } = (await request.json()) as {
    withdrawal_id?: string;
    reason?: string;
  };
  const why = clampText(reason, 300);
  if (!withdrawal_id || !isUuid(withdrawal_id) || !why) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }

  try {
    const row = await rejectWithdrawal(withdrawal_id, why);
    await logHqAction(session.user, "withdrawal.reject", { type: "withdrawal", id: withdrawal_id }, {
      reason: why,
      refunded: Number(row.gross_amount),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reject failed" },
      { status: 409 },
    );
  }
}
