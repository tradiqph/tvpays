import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import {
  assertHqCanManageMember,
  hqAssignUpline,
  resolveMemberIdByReferralCode,
} from "@/lib/hq/member-admin";
import { isUuid } from "@/lib/security/input";

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
    uplineId?: string;
    uplineReferralCode?: string;
  };

  let uplineId = body.uplineId?.trim() ?? "";
  if (!uplineId && body.uplineReferralCode) {
    const resolved = await resolveMemberIdByReferralCode(body.uplineReferralCode);
    if (!resolved) {
      return NextResponse.json({ error: "Upline not found" }, { status: 404 });
    }
    uplineId = resolved;
  }

  if (!isUuid(uplineId)) {
    return NextResponse.json({ error: "Invalid upline" }, { status: 400 });
  }

  try {
    await hqAssignUpline({
      userId: id,
      uplineId,
      actor: { id: session.user.id, email: session.user.email },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Assign failed" },
      { status: 400 },
    );
  }
}
