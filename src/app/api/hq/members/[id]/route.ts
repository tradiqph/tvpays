import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { clampText, isUuid } from "@/lib/security/input";

// ~100 years: Supabase has no "forever" ban, this is the conventional stand-in.
const SUSPEND_DURATION = "876000h";

type Action = "suspend" | "reactivate" | "reset_password";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid member" }, { status: 400 });
  }
  const { action, reason } = (await request.json()) as { action?: Action; reason?: string };
  if (id === session.user.id && action === "suspend") {
    return NextResponse.json({ error: "You can't suspend yourself" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target, error: findErr } = await admin.auth.admin.getUserById(id);
  if (findErr || !target.user) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  // Only super admins may act on other staff accounts.
  const targetRole = target.user.app_metadata?.role;
  if ((targetRole === "hq" || targetRole === "super_admin") && !session.isSuper) {
    return NextResponse.json({ error: "Only a super admin can manage staff accounts" }, { status: 403 });
  }

  switch (action) {
    case "suspend":
    case "reactivate": {
      const { error } = await admin.auth.admin.updateUserById(id, {
        ban_duration: action === "suspend" ? SUSPEND_DURATION : "none",
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 502 });
      await logHqAction(session.user, action === "suspend" ? "member.suspend" : "member.reactivate", {
        type: "member",
        id,
      }, reason ? { reason: clampText(reason, 300) } : {});
      return NextResponse.json({ ok: true });
    }
    case "reset_password": {
      if (!target.user.email) {
        return NextResponse.json({ error: "Member has no email" }, { status: 400 });
      }
      try {
        await sendPasswordResetEmail(target.user.email);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Couldn't send email" },
          { status: 502 },
        );
      }
      await logHqAction(session.user, "member.password_reset", { type: "member", id });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
