import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isAllowedDramaCdnUrl,
  requestPublicOrigin,
} from "@/lib/drama-cdn-url";

const MAX_PLAYLIST_BYTES = 512 * 1024;
const MAX_SEGMENT_BYTES = 18 * 1024 * 1024;

function isM3u8(url: URL, contentType: string): boolean {
  if (/\.m3u8(\?|$)/i.test(url.pathname)) return true;
  const ct = contentType.toLowerCase();
  return (
    ct.includes("mpegurl") ||
    ct.includes("vnd.apple.mpegurl") ||
    ct === "application/x-mpegurl"
  );
}

function rewriteM3u8(body: string, base: URL, origin: string): string {
  const relay = (target: URL) =>
    `${origin}/api/dramas/relay?url=${encodeURIComponent(target.href)}`;

  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      try {
        const target = new URL(trimmed, base);
        if (target.protocol !== "https:") return line;
        return relay(target);
      } catch {
        return line;
      }
    })
    .join("\n");
}

// GET /api/dramas/relay?url=https://cdn…/index.m3u8
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = isAllowedDramaCdnUrl(
    new URL(request.url).searchParams.get("url"),
  );
  if (!url) {
    return NextResponse.json({ error: "Invalid stream URL" }, { status: 400 });
  }

  const upstream = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (TvPays playback relay)",
      Accept: "*/*",
    },
    redirect: "follow",
    cache: "no-store",
  }).catch(() => null);

  if (!upstream?.ok) {
    return new NextResponse(null, { status: 502 });
  }

  const type = upstream.headers.get("content-type") ?? "";
  const length = Number(upstream.headers.get("content-length") ?? 0);
  const playlist = isM3u8(url, type);
  const maxBytes = playlist ? MAX_PLAYLIST_BYTES : MAX_SEGMENT_BYTES;
  if (length > maxBytes) {
    return new NextResponse(null, { status: 413 });
  }

  if (playlist) {
    const text = await upstream.text();
    if (text.length > MAX_PLAYLIST_BYTES) {
      return new NextResponse(null, { status: 413 });
    }
    const origin = requestPublicOrigin(request);
    const rewritten = rewriteM3u8(text, url, origin);
    return new NextResponse(rewritten, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "private, no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_SEGMENT_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": type || "application/octet-stream",
      "Cache-Control": "private, max-age=120",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
