import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { fetchAllMovieGasmItems } from "@/lib/youtube-rss";

/** Pings trailer YouTube RSS feed (no API key). */
export async function POST() {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const started = Date.now();
  try {
    const items = await fetchAllMovieGasmItems(20);
    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      results: [
        {
          provider: "trailer_feed",
          label: "Trailer feed (YouTube RSS)",
          ok: items.length > 0,
          items: items.length,
          ms: Date.now() - started,
          error: items.length ? null : "Feed returned no videos",
        },
      ],
    });
  } catch (e) {
    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      results: [
        {
          provider: "trailer_feed",
          label: "Trailer feed (YouTube RSS)",
          ok: false,
          items: 0,
          ms: Date.now() - started,
          error: e instanceof Error ? e.message : "Failed",
        },
      ],
    });
  }
}
