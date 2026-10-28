import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { dramaHome, enabledPlatforms, platformLabel } from "@/lib/shortdrama";

/** Pings each enabled drama provider (one /api/home call each; counts against quota). */
export async function POST() {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const results = await Promise.all(
    enabledPlatforms().map(async (p) => {
      const started = Date.now();
      try {
        const page = await dramaHome(p, "1", "6");
        return {
          provider: p,
          label: platformLabel(p),
          ok: page.items.length > 0,
          items: page.items.length,
          ms: Date.now() - started,
          error: page.items.length ? null : "Responded with no titles",
        };
      } catch (e) {
        return {
          provider: p,
          label: platformLabel(p),
          ok: false,
          items: 0,
          ms: Date.now() - started,
          error: e instanceof Error ? e.message : "Failed",
        };
      }
    }),
  );

  return NextResponse.json({ checkedAt: new Date().toISOString(), results });
}
