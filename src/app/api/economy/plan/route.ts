import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purchasePlan } from "@/lib/economy";
import { emailPlanPurchased } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = (await request.json()) as { slug?: string };
  if (!slug) {
    return NextResponse.json({ error: "Missing plan" }, { status: 400 });
  }

  try {
    const plan = await purchasePlan(user.id, slug);
    if (user.email) {
      await emailPlanPurchased(user.email, plan.name);
    }
    return NextResponse.json({
      ok: true,
      plan: plan.slug,
      dramaDaysAdded: plan.dramaBundleDays,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Purchase failed";
    if (msg.includes("insufficient")) {
      return NextResponse.json(
        { error: "Insufficient deposit balance. Top up your deposit wallet first." },
        { status: 400 },
      );
    }
    if (msg.includes("plan_already_active")) {
      return NextResponse.json(
        { error: "This plan is already active and cannot be extended here." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
