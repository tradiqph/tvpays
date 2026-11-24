import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getHqSession } from "@/lib/hq/auth";

const LIMIT = 30;

export async function GET() {
  const session = await getHqSession();
  if (!session?.isSuper) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hq_merchant_payouts")
    .select(
      "id, amount_php, destination_type, destination_number, destination_name, status, starpago_order_no, failure_reason, created_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ payouts: data ?? [] });
}