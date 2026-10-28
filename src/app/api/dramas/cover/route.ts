import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedDramaCdnUrl } from "@/lib/drama-cdn-url";

const MAX_BYTES = 5 * 1024 * 1024;

// Covers come from many provider CDNs; serving them same-origin avoids browsers
// and extensions that block third-party images.

// GET /api/dramas/cover?url=https://cdn.example.com/cover.jpg
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
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  // Do not use Next.js fetch cache: responses over 2MB cannot be stored and log errors.
  const upstream = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (TvPays cover proxy)" },
    redirect: "error",
    cache: "no-store",
  }).catch(() => null);

  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream?.ok || !type.startsWith("image/")) {
    return new NextResponse(null, { status: 502 });
  }
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) {
    return new NextResponse(null, { status: 413 });
  }
  const body = await upstream.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
