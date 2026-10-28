import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_WITHDRAWAL_PHP,
  MIN_WITHDRAWAL_PHP,
  WITHDRAWAL_TAX_RATE,
} from "@/lib/plans";
import { clampText } from "@/lib/security/input";
import {
  hasActivePaidSubscription,
  WITHDRAWAL_REQUIRES_ACTIVE_PLAN_MESSAGE,
} from "@/lib/membership";
import { walletApply, getWallet } from "@/lib/wallet";
import { emailWithdrawalAdminNotify } from "@/lib/email";
import {
  normalizePhMobile,
  parseStarpagoMemberMethod,
  validateGcashPayerName,
} from "@/lib/starpago";
import { AUTO_PAYOUT_MAX_GROSS_PHP } from "@/lib/withdrawals";
import {
  dispatchWithdrawalPayout,
  markWithdrawalFailedAndRefund,
} from "@/lib/hq-withdrawals";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActivePaidSubscription(user.id))) {
    return NextResponse.json(
      { error: WITHDRAWAL_REQUIRES_ACTIVE_PLAN_MESSAGE },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    amount?: number;
    destination_type?: string;
    destination_number?: string;
    destination_name?: string;
  };

  const gross = Number(body.amount);
  if (!Number.isFinite(gross) || gross < MIN_WITHDRAWAL_PHP) {
    return NextResponse.json(
      { error: `Minimum withdrawal is ₱${MIN_WITHDRAWAL_PHP}` },
      { status: 400 },
    );
  }
  if (gross > MAX_WITHDRAWAL_PHP) {
    return NextResponse.json(
      {
        error: `Maximum withdrawal per request is ₱${MAX_WITHDRAWAL_PHP.toLocaleString("en-PH")}`,
      },
      { status: 400 },
    );
  }

  const destType = String(body.destination_type ?? "gcash").toLowerCase();
  if (!parseStarpagoMemberMethod(destType)) {
    return NextResponse.json(
      { error: "Withdrawals are available to GCash and Maya only" },
      { status: 400 },
    );
  }

  const destNumberRaw = String(body.destination_number ?? "").trim();
  const destName = clampText(body.destination_name, 80);
  const nameErr = validateGcashPayerName(destName);
  if (nameErr) {
    return NextResponse.json({ error: nameErr }, { status: 400 });
  }

  const destNumber = normalizePhMobile(destNumberRaw);
  if (!destNumber) {
    return NextResponse.json(
      { error: "Enter a valid Philippine mobile number (09XXXXXXXXX)" },
      { status: 400 },
    );
  }

  const wallet = await getWallet(user.id);
  if (wallet.withdrawal < gross) {
    return NextResponse.json(
      { error: "Insufficient withdrawal balance" },
      { status: 400 },
    );
  }

  const tax = Math.round(gross * WITHDRAWAL_TAX_RATE * 100) / 100;
  const net = Math.round((gross - tax) * 100) / 100;

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("withdrawals")
    .insert({
      user_id: user.id,
      gross_amount: gross,
      tax_amount: tax,
      net_amount: net,
      status: "pending",
      destination_type: destType,
      destination_number: destNumber,
      destination_name: destName,
      destination_bic: null,
      refund_status: "none",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await walletApply(
      user.id,
      "withdrawal",
      -gross,
      "withdrawal_request",
      row.id,
    );
  } catch {
    await admin.from("withdrawals").delete().eq("id", row.id);
    return NextResponse.json({ error: "Could not reserve balance" }, { status: 500 });
  }

  const autoPayout = gross <= AUTO_PAYOUT_MAX_GROSS_PHP;
  await emailWithdrawalAdminNotify({
    withdrawalId: row.id,
    memberEmail: user.email ?? null,
    gross,
    tax,
    net,
    destinationType: destType,
    destinationNumber: destNumber,
    destinationName: destName,
    autoPayoutAttempted: autoPayout,
  });

  if (autoPayout) {
    try {
      await dispatchWithdrawalPayout(row.id);
    } catch (e) {
      console.error("[withdraw] auto payout failed", row.id, e);
      try {
        await markWithdrawalFailedAndRefund(
          row.id,
          e instanceof Error ? e.message : "Payout could not be started",
        );
      } catch (refundErr) {
        console.error("[withdraw] refund after auto payout fail", refundErr);
      }
    }
  }

  return NextResponse.json({ id: row.id, net_amount: net });
}
