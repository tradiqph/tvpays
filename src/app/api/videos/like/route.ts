import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { manilaViewDate } from "@/lib/manila-date";
import { getEffectivePlanSlug } from "@/lib/membership";
import { planBySlug } from "@/lib/plans";
import { LIKE_ADS_POINTS, type LikeResult } from "@/lib/video-likes";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    video_id?: string;
  };
  if (!body.video_id) {
    return NextResponse.json({ error: "Missing video" }, { status: 400 });
  }

  const planSlug = await getEffectivePlanSlug(user.id);
  const plan = planBySlug(planSlug) ?? planBySlug("trial")!;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("toggle_video_like", {
    p_user_id: user.id,
    p_video_id: body.video_id,
    p_date: manilaViewDate(),
    p_daily_cap: plan.adsPerDay,
    p_points: LIKE_ADS_POINTS,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data as LikeResult);
}
