import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import {
  assertHqCanManageMember,
  hqCreditWallet,
} from "@/lib/hq/member-admin";
import { isUuid } from "@/lib/security/input";
import type { WalletBucket } from "@/lib/wallet";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid member" }, { status: 400 });
  }

  const guard = await assertHqCanManageMember(session, id);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = (await request.json()) as {
    amount?: number;
    bucket?: string;
    note?: string;
  };

  const bucket = body.bucket as WalletBucket;
  if (bucket !== "deposit" && bucket !== "withdrawal") {
    return NextResponse.json(
      { error: "bucket must be deposit or withdrawal" },
      { status: 400 },
    );
  }

  try {
    await hqCreditWallet({
      userId: id,
      bucket,
      amount: Number(body.amount),
      note: body.note,
      actor: { id: session.user.id, email: session.user.email },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Credit failed" },
      { status: 400 },
    );
  }
}
