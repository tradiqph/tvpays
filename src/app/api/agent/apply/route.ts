import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planBySlug } from "@/lib/plans";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan_slug, agent_status")
    .eq("id", user.id)
    .single();

  const plan = planBySlug(profile?.plan_slug ?? "trial");
  if (!plan?.minForAgent) {
    return NextResponse.json(
      { error: "Elite Pro or higher required to apply as Agent" },
      { status: 403 },
    );
  }

  if (profile?.agent_status === "approved") {
    return NextResponse.json({ ok: true, status: "approved" });
  }
  if (profile?.agent_status === "pending") {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  const { error } = await admin.from("agent_applications").insert({
    user_id: user.id,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("profiles")
    .update({ agent_status: "pending" })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, status: "pending" });
}
