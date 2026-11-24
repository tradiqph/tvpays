import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import {
  syncHqMerchantPayout,
  syncInFlightHqMerchantPayouts,
} from "@/lib/hq-merchant-payout";
import { isUuid } from "@/lib/security/input";

export async function POST(request: Request) {
  const session = await getHqSession();
  if (!session?.isSuper) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const { payout_id } = (await request.json().catch(() => ({}))) as {
    payout_id?: string;
  };

  try {
    if (payout_id && isUuid(payout_id)) {
      const status = await syncHqMerchantPayout(payout_id);
      await logHqAction(
        session.user,
        "merchant.payout.sync",
        { type: "hq_merchant_payout", id: payout_id },
        { status },
      );
      return NextResponse.json({ status });
    }

    const result = await syncInFlightHqMerchantPayouts();
    await logHqAction(session.user, "merchant.payout.sync", { type: "hq_merchant_payout", id: "all" }, result);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 502 },
    );
  }
}