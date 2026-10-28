import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  clientIpFromRequest,
  isStarpagoCallbackIpAllowed,
  isStarpagoPaidStatus,
  starpagoAppSecret,
  starpagoVerify,
} from "@/lib/starpago";
import { creditStarpagoDeposit } from "@/lib/starpago-deposit";
import { emailDepositPaid } from "@/lib/email";
import { applyStarpagoPayoutToWithdrawal } from "@/lib/hq-withdrawals";
import {
  mapStarpagoPayoutStatus,
  queryStarpagoPayout,
} from "@/lib/starpago-payout";
import { isWithdrawalPayoutMerOrderNo } from "@/lib/withdrawals";

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  if (!isStarpagoCallbackIpAllowed(ip)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = starpagoAppSecret();
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || !starpagoVerify(body, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const status = Number(body.orderStatus ?? body.status ?? 0);
  const merOrderNo = String(body.merOrderNo ?? "");
  if (!merOrderNo) {
    return NextResponse.json({ error: "Missing merOrderNo" }, { status: 400 });
  }

  if (isWithdrawalPayoutMerOrderNo(merOrderNo)) {
    let orderStatus = status;
    let message =
      typeof body.message === "string" ? body.message : undefined;
    const action = mapStarpagoPayoutStatus(orderStatus);
    if (action !== "in_progress") {
      try {
        const queried = await queryStarpagoPayout(merOrderNo);
        orderStatus = queried.orderStatus;
        message = queried.message ?? message;
      } catch (e) {
        console.warn("[starpago/notify] payout query failed", merOrderNo, e);
      }
    }
    await applyStarpagoPayoutToWithdrawal(merOrderNo, orderStatus, message);
    return NextResponse.json({ ok: true });
  }

  if (!isStarpagoPaidStatus(status)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();
  const { data: deposit } = await admin
    .from("starpago_deposits")
    .select("id, user_id, amount, payer_email")
    .eq("mer_order_no", merOrderNo)
    .maybeSingle();

  if (!deposit) {
    return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
  }

  const credited = await creditStarpagoDeposit(deposit.id);
  if (credited) {
    const { data: user } = await admin.auth.admin.getUserById(deposit.user_id);
    const email = user.user?.email ?? deposit.payer_email;
    if (email) {
      await emailDepositPaid(email, Number(deposit.amount));
    }
  }

  return NextResponse.json({ ok: true });
}
