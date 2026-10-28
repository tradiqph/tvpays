import { NextResponse } from "next/server";
import { creditDramaEpisode } from "@/lib/economy";
import { createClient } from "@/lib/supabase/server";
import {
  isSafeDramaId,
  isSafePlatform,
} from "@/lib/security/input";
import { enabledPlatforms } from "@/lib/shortdrama";

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
    actual_file_seconds?: number | null;
    peak_seconds?: number | null;
    finished?: boolean;
  };

  const platform = String(body.platform ?? "").trim().toLowerCase();
  const dramaId = String(body.drama_id ?? "").trim();
  const episodeNumber = Number(body.episode_number);
  const watchSeconds = Number(body.watch_seconds);

  if (
    !platform ||
    !dramaId ||
    !Number.isInteger(episodeNumber) ||
    !Number.isFinite(watchSeconds)
  ) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!isSafePlatform(platform, enabledPlatforms())) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }
  if (!isSafeDramaId(dramaId)) {
    return NextResponse.json({ error: "Invalid drama" }, { status: 400 });
  }
  if (episodeNumber < 1 || episodeNumber > 9999) {
    return NextResponse.json({ error: "Invalid episode" }, { status: 400 });
  }
  if (watchSeconds < 0 || watchSeconds > 86_400) {
    return NextResponse.json({ error: "Invalid watch duration" }, { status: 400 });
  }

  const durationSeconds =
    body.duration_seconds == null ? null : Number(body.duration_seconds);
  const actualFileSeconds =
    body.actual_file_seconds == null ? null : Number(body.actual_file_seconds);
  if (
    durationSeconds != null &&
    (!Number.isFinite(durationSeconds) ||
      durationSeconds < 0 ||
      durationSeconds > 86_400)
  ) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }
  if (
    actualFileSeconds != null &&
    (!Number.isFinite(actualFileSeconds) ||
      actualFileSeconds < 0 ||
      actualFileSeconds > 86_400)
  ) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }
  const peakSeconds =
    body.peak_seconds == null ? null : Number(body.peak_seconds);
  if (
    peakSeconds != null &&
    (!Number.isFinite(peakSeconds) || peakSeconds < 0 || peakSeconds > 86_400)
  ) {
    return NextResponse.json({ error: "Invalid watch duration" }, { status: 400 });
  }

  try {
    const result = await creditDramaEpisode(user.id, {
      platform,
      drama_id: dramaId,
      episode_number: episodeNumber,
      watch_seconds: watchSeconds,
      duration_seconds: durationSeconds,
      actual_file_seconds: actualFileSeconds,
      peak_seconds: peakSeconds,
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
    if (msg === "not_finished") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg === "insufficient_watch") {
      return NextResponse.json(
        {
          error:
            "Watch the full episode without skipping ahead for it to count.",
        },
        { status: 400 },
      );
    }
    if (msg === "invalid_drama") {
      return NextResponse.json({ error: "Invalid drama" }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
