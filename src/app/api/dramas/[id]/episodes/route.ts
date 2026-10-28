import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertCanStreamEpisode,
  DramaAccessError,
  getDramaAccess,
} from "@/lib/drama-access";
import {
  dramaEpisodes,
  resolvePlatform,
  ShortDramaError,
} from "@/lib/shortdrama";

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
  try {
    const access = await getDramaAccess(user.id);
    let platform = resolvePlatform(
      new URL(request.url).searchParams.get("platform"),
    );
    if (access.watchMode === "trial") {
      platform = access.defaultPlatform as typeof platform;
    }
    await assertCanStreamEpisode(user.id, platform);
    return NextResponse.json(await dramaEpisodes(platform, id));
  } catch (e) {
    if (e instanceof DramaAccessError) {
      const status =
        e.code === "renewal_required" || e.code === "drama_locked" ? 403 : 429;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    const status = e instanceof ShortDramaError ? e.status : 502;
    const msg = e instanceof Error ? e.message : "Could not load episodes";
    return NextResponse.json({ error: msg }, { status });
  }
}
