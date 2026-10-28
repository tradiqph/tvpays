import { NextResponse } from "next/server";
import { parseTransferCallback } from "@/lib/paymongo-payout";
import { applyPaymongoTransferToWithdrawal } from "@/lib/hq-withdrawals";

export async function POST(request: Request) {
  const raw = await request.text();
  const { transferId, status } = parseTransferCallback(raw);
  if (!transferId || !status) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  await applyPaymongoTransferToWithdrawal(transferId, status);
  return NextResponse.json({ ok: true });
}
