import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { creditAdView } from "@/lib/economy";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { video_id } = (await request.json()) as { video_id?: string };
  if (!video_id) {
    return NextResponse.json({ error: "Missing video" }, { status: 400 });
  }

  try {
    const result = await creditAdView(user.id, video_id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    if (msg === "daily_limit") {
      return NextResponse.json({ error: "Daily ad limit reached" }, { status: 429 });
    }
    if (msg === "already_viewed") {
      return NextResponse.json({ error: "Already credited for this ad today" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
