import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import { syncWithdrawal } from "@/lib/hq-withdrawals";
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
    const status = await syncWithdrawal(withdrawal_id);
    await logHqAction(session.user, "withdrawal.sync", { type: "withdrawal", id: withdrawal_id }, { status });
    return NextResponse.json({ status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 502 },
    );
  }
}
