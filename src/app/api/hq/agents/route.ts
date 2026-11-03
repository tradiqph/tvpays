import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import { emailAgentDecision } from "@/lib/email";

export async function POST(request: Request) {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user_id, approve } = (await request.json()) as {
    user_id?: string;
    approve?: boolean;
  };
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const status = approve ? "approved" : "rejected";
  const admin = createAdminClient();

  await admin
    .from("profiles")
    .update({ agent_status: status })
    .eq("id", user_id);

  await admin
    .from("agent_applications")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("user_id", user_id)
    .eq("status", "pending");

  await logHqAction(
    session.user,
    approve ? "agent.approve" : "agent.reject",
    { type: "member", id: user_id },
  );

  const { data: authUser } = await admin.auth.admin.getUserById(user_id);
  if (authUser.user?.email) {
    await emailAgentDecision(authUser.user.email, !!approve);
  }

  return NextResponse.json({ ok: true, status });
}
