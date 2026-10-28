import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { creditDramaEpisode } from "@/lib/economy";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    platform?: string;
    drama_id?: string;
    episode_number?: number;
    watch_seconds?: number;
    duration_seconds?: number | null;
    finished?: boolean;
  };

  if (
    !body.platform ||
    !body.drama_id ||
    body.episode_number == null ||
    body.watch_seconds == null
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const result = await creditDramaEpisode(user.id, {
      platform: body.platform,
      drama_id: body.drama_id,
      episode_number: body.episode_number,
      watch_seconds: body.watch_seconds,
      duration_seconds: body.duration_seconds,
      finished: body.finished === true,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    if (msg === "already_completed") {
      return NextResponse.json(
        { error: "Episode already counted today." },
        { status: 409 },
      );
    }
    if (msg === "not_finished" || msg === "insufficient_watch") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
