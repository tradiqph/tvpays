import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { syncMovieGasmVideosToDb } from "@/lib/youtube-rss";

export async function POST(request: Request) {
  const secret = process.env.VIDEOS_SYNC_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  const bearerOk =
    secret &&
    authHeader === `Bearer ${secret}`;

  if (!bearerOk) {
    const session = await getHqSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await syncMovieGasmVideosToDb();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
