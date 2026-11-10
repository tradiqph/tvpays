import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { manilaViewDate } from "@/lib/manila-date";
import { getEffectivePlanSlug } from "@/lib/membership";
import { planBySlug } from "@/lib/plans";
import { getAdCreditLimits } from "@/lib/forfeited-tasks";

export type VideoListItem = {
  id: string;
  title: string;
  youtube_id: string;
  duration_label: string | null;
  visibility: string;
  display_views: number;
  ads_fund_display: number;
  published_at: string | null;
  credited_today: boolean;
  liked: boolean;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";
  const sort = searchParams.get("sort") ?? "latest";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(
    30,
    Math.max(1, Number(searchParams.get("limit") ?? "10") || 10),
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("videos").select(
    "id, title, youtube_id, duration_label, visibility, display_views, ads_fund_display, published_at, sort_order",
    { count: "exact" },
  );

  if (filter === "members") {
    query = query.eq("visibility", "members");
  } else if (filter === "public") {
    query = query.eq("visibility", "public");
  }

  if (sort === "oldest") {
    query = query
      .order("published_at", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true });
  } else if (sort === "popular") {
    query = query
      .order("display_views", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false });
  } else {
    query = query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("sort_order", { ascending: false });
  }

  const { data: rows, error, count } = await query.range(from, to);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = count ?? 0;
  const hasMore = from + (rows?.length ?? 0) < total;

  const today = manilaViewDate();
  const { data: viewsToday } = await supabase
    .from("ad_views")
    .select("video_id")
    .eq("user_id", user.id)
    .eq("view_date", today);

  const credited = new Set((viewsToday ?? []).map((r) => r.video_id));

  const ids = (rows ?? []).map((v) => v.id);
  const { data: likeRows } = ids.length
    ? await supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", user.id)
        .eq("liked", true)
        .eq("like_date", today)
        .in("video_id", ids)
    : { data: [] as { video_id: string }[] };
  const liked = new Set((likeRows ?? []).map((r) => r.video_id));

  const { count: likesRewardedToday } = await supabase
    .from("video_likes")
    .select("video_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("like_date", today)
    .gt("points_awarded", 0);

  const videos: VideoListItem[] = (rows ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    youtube_id: v.youtube_id,
    duration_label: v.duration_label,
    visibility: v.visibility,
    display_views: Number(v.display_views),
    ads_fund_display: Number(v.ads_fund_display),
    published_at: v.published_at,
    credited_today: credited.has(v.id),
    liked: liked.has(v.id),
  }));

  const planSlug = await getEffectivePlanSlug(user.id);
  const plan = planBySlug(planSlug) ?? planBySlug("trial")!;
  const limits = await getAdCreditLimits(user.id, plan);

  return NextResponse.json({
    videos,
    adsToday: limits.adsToday,
    adsLimit: limits.adsLimit,
    regularToday: limits.regularToday,
    regularLimit: limits.regularLimit,
    forfeitedToday: limits.forfeitedToday,
    forfeitedLimit: limits.forfeitedLimit,
    forfeitedBalance: limits.forfeitedBalance,
    likesRewardedToday: likesRewardedToday ?? 0,
    likeCap: plan.adsPerDay,
    filter,
    sort,
    page,
    limit,
    total,
    hasMore,
  });
}
