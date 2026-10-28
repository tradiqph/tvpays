import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { searchMembersForLookup } from "@/lib/hq/member-audit";
import { isUuid } from "@/lib/security/input";

export async function GET(request: Request) {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const excludeId = searchParams.get("excludeId") ?? "";
  if (excludeId && !isUuid(excludeId)) {
    return NextResponse.json({ error: "Invalid excludeId" }, { status: 400 });
  }

  const rows = await searchMembersForLookup(q, excludeId);
  return NextResponse.json({ rows });
}
