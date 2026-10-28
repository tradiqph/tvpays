import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { hqResolveFrozenWithdrawal } from "@/lib/hq-withdrawals";
import { logHqAction } from "@/lib/hq/audit";
import { isUuid } from "@/lib/security/input";

export async function POST(request: Request) {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { withdrawal_id, outcome } = (await request.json()) as {
    withdrawal_id?: string;
    outcome?: "refund" | "completed";
  };

  if (
    !withdrawal_id ||
    !isUuid(withdrawal_id) ||
    (outcome !== "refund" && outcome !== "completed")
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await hqResolveFrozenWithdrawal(withdrawal_id, outcome);
    await logHqAction(
      session.user,
      outcome === "refund" ? "withdrawal.frozen_refund" : "withdrawal.frozen_complete",
      { type: "withdrawal", id: withdrawal_id },
      { outcome },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not resolve" },
      { status: 400 },
    );
  }
}
