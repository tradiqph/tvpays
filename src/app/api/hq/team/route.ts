import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import { findAuthUserByEmail } from "@/lib/hq/users";

type Role = "hq" | "super_admin" | "none";

/** Grants or revokes HQ access. Super admins only. */
export async function POST(request: Request) {
  const session = await getHqSession();
  if (!session?.isSuper) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { email, role } = (await request.json()) as { email?: string; role?: Role };
  const clean = email?.trim().toLowerCase();
  if (!clean || !role || !["hq", "super_admin", "none"].includes(role)) {
    return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
  }

  const target = await findAuthUserByEmail(clean);
  if (!target) {
    return NextResponse.json(
      { error: "No account with that email. They need to sign up first." },
      { status: 404 },
    );
  }
  if (target.id === session.user.id && role !== "super_admin") {
    return NextResponse.json({ error: "You can't remove your own super admin access" }, { status: 400 });
  }

  const nextMeta = { ...target.app_metadata };
  if (role === "none") delete nextMeta.role;
  else nextMeta.role = role;

  const { error } = await createAdminClient().auth.admin.updateUserById(target.id, {
    app_metadata: nextMeta,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  await logHqAction(session.user, role === "none" ? "team.revoke" : "team.grant", {
    type: "member",
    id: target.id,
  }, { email: clean, role, previous: target.app_metadata?.role ?? null });

  return NextResponse.json({ ok: true });
}
