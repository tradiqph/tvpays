import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import {
  fetchMemberAuditDeposits,
  fetchMemberAuditReferrals,
  fetchMemberAuditSummary,
  fetchMemberAuditTransactions,
  fetchMemberAuditWithdrawals,
} from "@/lib/hq/member-audit";
import { isUuid } from "@/lib/security/input";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getHqSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid member" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section") ?? "summary";
  const limit = Number(searchParams.get("limit") ?? 50);
  const offset = Number(searchParams.get("offset") ?? 0);

  if (section === "summary") {
    const summary = await fetchMemberAuditSummary(id);
    if (!summary) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json(summary);
  }

  if (section === "transactions") {
    return NextResponse.json(
      await fetchMemberAuditTransactions(id, limit, offset),
    );
  }

  if (section === "deposits") {
    return NextResponse.json(await fetchMemberAuditDeposits(id, limit, offset));
  }

  if (section === "withdrawals") {
    return NextResponse.json(
      await fetchMemberAuditWithdrawals(id, limit, offset),
    );
  }

  if (section === "referrals") {
    return NextResponse.json(await fetchMemberAuditReferrals(id, limit, offset));
  }

  return NextResponse.json({ error: "Unknown section" }, { status: 400 });
}
