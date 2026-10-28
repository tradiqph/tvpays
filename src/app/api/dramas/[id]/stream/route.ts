import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertCanStreamEpisode,
  DramaAccessError,
  getDramaAccess,
} from "@/lib/drama-access";
import {
  dramaStream,
  resolvePlatform,
  ShortDramaError,
} from "@/lib/shortdrama";

// GET /api/dramas/:id/stream?platform=flickreels&episode=3
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const episode = Number(searchParams.get("episode"));
  if (!Number.isInteger(episode) || episode < 1) {
    return NextResponse.json({ error: "Invalid episode" }, { status: 400 });
  }

  try {
    const access = await getDramaAccess(user.id);
    let platform = resolvePlatform(searchParams.get("platform"));
    if (access.watchMode === "trial") {
      platform = access.defaultPlatform as typeof platform;
    }
    await assertCanStreamEpisode(user.id, platform);
    return NextResponse.json(await dramaStream(platform, id, episode));
  } catch (e) {
    if (e instanceof DramaAccessError) {
      const status =
        e.code === "renewal_required" || e.code === "drama_locked" ? 403 : 429;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const status = e instanceof ShortDramaError ? e.status : 502;
    const msg = e instanceof Error ? e.message : "Could not load episode";
    return NextResponse.json({ error: msg }, { status });
  }
}
