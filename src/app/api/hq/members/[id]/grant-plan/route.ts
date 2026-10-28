import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { assertHqCanManageMember, hqGrantPlan } from "@/lib/hq/member-admin";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";
import { isAllowedPlanSlug, isUuid } from "@/lib/security/input";

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

  const body = (await request.json()) as { slug?: string; note?: string };
  const slug = String(body.slug ?? "").trim();
  const planSlugs = SUBSCRIPTION_PLANS.map((p) => p.slug);
  if (!isAllowedPlanSlug(slug, planSlugs) || slug === "trial") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const plan = await hqGrantPlan({
      userId: id,
      planSlug: slug,
      note: body.note,
      actor: { id: session.user.id, email: session.user.email },
    });
    return NextResponse.json({ ok: true, plan: plan.slug });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Grant failed" },
      { status: 400 },
    );
  }
}
