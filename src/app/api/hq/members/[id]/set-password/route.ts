import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import {
  assertHqCanManageMember,
  setMemberPassword,
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

  const body = (await request.json()) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";

  try {
    await setMemberPassword(id, password);
    await logHqAction(session.user, "member.set_password", {
      type: "member",
      id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not set password" },
      { status: 400 },
    );
  }
}
