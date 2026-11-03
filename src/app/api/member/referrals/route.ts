import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAgentReferralGate } from "@/lib/agent-referral-access";
import { getMemberReferrals } from "@/lib/member-referrals";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await getAgentReferralGate(user.id);
  if (gate) {
    return NextResponse.json(gate, { status: 403 });
  }

  const payload = await getMemberReferrals(user.id);
  return NextResponse.json(payload);
}
