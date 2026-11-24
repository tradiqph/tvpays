import { NextResponse } from "next/server";
import { getHqSession } from "@/lib/hq/auth";
import { logHqAction } from "@/lib/hq/audit";
import {
  dispatchHqMerchantPayout,
  validateHqMerchantPayoutInput,
} from "@/lib/hq-merchant-payout";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  queryStarpagoMerchantBalance,
  starpagoErrorDebugPayload,
  starpagoPayoutNotifyOriginOk,
  starpagoUserFacingError,
} from "@/lib/starpago";

export async function POST(request: Request) {
  const session = await getHqSession();
  if (!session?.isSuper) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const validated = validateHqMerchantPayoutInput(raw);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  if (!starpagoPayoutNotifyOriginOk()) {
    return NextResponse.json(
      {
        error:
          "StarPago payouts need a public HTTPS notify URL. Set NEXT_PUBLIC_APP_URL=https://tvpays.net in .env.local and restart the dev server.",
      },
      { status: 400 },
    );
  }

  try {
    const balance = await queryStarpagoMerchantBalance();
    if (validated.data.amount_php > balance.payoutValue) {
      return NextResponse.json(
        {
          error: `Amount exceeds StarPago payout balance (₱${balance.payoutValue.toFixed(2)} available).`,
        },
        { status: 400 },
      );
    }
  } catch (e) {
    console.error("[hq/wallet/withdraw] balance check failed", e);
  }

  const admin = createAdminClient();
  const { data: row, error: insertError } = await admin
    .from("hq_merchant_payouts")
    .insert({
      created_by: session.user.id,
      amount_php: validated.data.amount_php,
      destination_type: validated.data.destination_type,
      destination_number: validated.data.destination_number,
      destination_name: validated.data.destination_name,
      destination_mobile: validated.data.destination_mobile,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not record payout" },
      { status: 502 },
    );
  }

  try {
    const result = await dispatchHqMerchantPayout(row.id);
    await logHqAction(
      session.user,
      "merchant.payout",
      { type: "hq_merchant_payout", id: row.id },
      {
        amount_php: validated.data.amount_php,
        destination_type: validated.data.destination_type,
        order_no: result.orderNo,
        order_status: result.orderStatus,
      },
    );
    return NextResponse.json({
      id: row.id,
      order_no: result.orderNo,
      order_status: result.orderStatus,
    });
  } catch (e) {
    const debug = starpagoErrorDebugPayload(e);
    return NextResponse.json(
      {
        error: starpagoUserFacingError(e),
        id: row.id,
        ...(debug ? { debug } : {}),
      },
      { status: 502 },
    );
  }
}