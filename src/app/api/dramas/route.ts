import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertCanStreamEpisode,
  DramaAccessError,
  getDramaAccess,
} from "@/lib/drama-access";
import {
  dramaHome,
  dramaSearch,
  resolvePlatform,
  ShortDramaError,
} from "@/lib/shortdrama";

// GET /api/dramas?platform=reelshort&q=...       → search
// GET /api/dramas?platform=reelshort&cursor=...  → home feed (paginated)
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const cursor = searchParams.get("cursor") ?? undefined;

  try {
    const access = await getDramaAccess(user.id);
    let platform = resolvePlatform(searchParams.get("platform"));
    if (access.watchMode === "trial") {
      platform = access.defaultPlatform as typeof platform;
    }
    await assertCanStreamEpisode(user.id, platform);
    const page = q
      ? await dramaSearch(platform, q)
      : await dramaHome(platform, cursor);
    return NextResponse.json(page);
  } catch (e) {
    const status = e instanceof ShortDramaError ? e.status : 502;
    const msg = e instanceof Error ? e.message : "Could not load dramas";
    return NextResponse.json({ error: msg }, { status });
  }
}
