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
// GET /api/dramas?platform=netshort&section=...   → one home-feed section
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
  const sectionRaw = searchParams.get("section")?.trim();
  const section = sectionRaw && sectionRaw.length <= 64 ? sectionRaw : undefined;
  if (q && q.length > 80) {
    return NextResponse.json({ error: "Search is too long" }, { status: 400 });
  }

  try {
    const access = await getDramaAccess(user.id);
    let platform = resolvePlatform(searchParams.get("platform"));
    if (access.watchMode === "trial") {
      platform = access.defaultPlatform as typeof platform;
    }
    await assertCanStreamEpisode(user.id, platform);
    const page = q
      ? await dramaSearch(platform, q)
      : await dramaHome(platform, cursor, undefined, section);
    return NextResponse.json(page);
  } catch (e) {
    const status = e instanceof ShortDramaError ? e.status : 502;
    const msg = e instanceof Error ? e.message : "Could not load dramas";
    return NextResponse.json({ error: msg }, { status });
  }
}
