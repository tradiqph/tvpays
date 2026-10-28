import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createAdminClient, appOrigin } from "@/lib/supabase/admin";
import { MIN_TOPUP_PHP } from "@/lib/plans";
import {
  STARPAGO_MIN_AMOUNT_PHP,
  createPayinOrder,
  generateMerOrderNo,
  normalizePhMobile,
  parseStarpagoMemberMethod,
  starpagoConfigured,
  starpagoEwalletFeeForAmount,
  starpagoEwalletLabel,
  starpagoPayMethodFromMember,
  StarpagoRequestError,
  type StarpagoMemberMethod,
  validateGcashPayerName,
} from "@/lib/starpago";

const DEPOSIT_EXPIRY_MINUTES = 30;

export type WalletBucket = "deposit" | "spending";

function walletReturnUrl(method: StarpagoMemberMethod, depositId: string) {
  const param = method === "maya" ? "maya" : "gcash";
  return `${appOrigin()}/wallet?${param}=${depositId}`;
}

export async function createMemberStarpagoDeposit(
  user: User,
  body: Record<string, unknown>,
): Promise<Response> {
  const method = parseStarpagoMemberMethod(body.method);
  if (!method) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  const target = String(body.target_bucket ?? "deposit").toLowerCase();
  if (target !== "deposit" && target !== "spending") {
    return NextResponse.json({ error: "Invalid wallet target." }, { status: 400 });
  }

  if (!starpagoConfigured()) {
    return NextResponse.json(
      { error: `${starpagoEwalletLabel(method)} top-up is not available.` },
      { status: 503 },
    );
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < MIN_TOPUP_PHP) {
    return NextResponse.json(
      { error: `Minimum top-up is ₱${MIN_TOPUP_PHP}` },
      { status: 400 },
    );
  }
  if (amount < STARPAGO_MIN_AMOUNT_PHP) {
    return NextResponse.json(
      {
        error: `Minimum ${starpagoEwalletLabel(method)} amount is ₱${STARPAGO_MIN_AMOUNT_PHP}`,
      },
      { status: 400 },
    );
  }

  const mobile = normalizePhMobile(String(body.mobile ?? ""));
  if (!mobile) {
    return NextResponse.json(
      { error: "Enter a valid mobile number (09XXXXXXXXX)" },
      { status: 400 },
    );
  }

  const nameError = validateGcashPayerName(String(body.account_name ?? ""));
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }

  const accountName = String(body.account_name).trim();
  const email =
    user.email?.trim() ||
    `${mobile}@${method === "maya" ? "maya" : "gcash"}.local`;
  const depositId = crypto.randomUUID();
  const merOrderNo = generateMerOrderNo();
  const fees = starpagoEwalletFeeForAmount(amount);
  const expiresAt = new Date(
    Date.now() + DEPOSIT_EXPIRY_MINUTES * 60_000,
  ).toISOString();
  const payMethod = starpagoPayMethodFromMember(method);

  let order;
  try {
    order = await createPayinOrder({
      payMethod,
      merOrderNo,
      amountPhp: amount,
      email,
      mobile,
      accountName,
      attach: user.id,
      returnUrl: walletReturnUrl(method, depositId),
    });
  } catch (err) {
    console.error("[starpago/deposits] create order failed", err);
    const debug =
      process.env.NODE_ENV === "development" &&
      err instanceof StarpagoRequestError
        ? err.apiMsg
        : undefined;
    return NextResponse.json(
      {
        error: `${starpagoEwalletLabel(method)} payment could not start.`,
        ...(debug ? { debug } : {}),
      },
      { status: 502 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("starpago_deposits")
    .insert({
      id: depositId,
      user_id: user.id,
      target_bucket: target,
      amount,
      fee_rate: fees.fee_rate,
      fee_php: fees.fee_php,
      net_php: fees.net_php,
      status: "pending",
      pay_method: payMethod,
      mer_order_no: merOrderNo,
      order_no: order.orderNo,
      payment_link: order.paymentLink,
      payer_mobile: mobile,
      payer_name: accountName,
      payer_email: email,
      expires_at: expiresAt,
    })
    .select("id, amount, payment_link, expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save deposit" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    amount: Number(data.amount),
    payment_link: data.payment_link,
    expires_at: data.expires_at,
  });
}

export async function creditStarpagoDeposit(depositId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("starpago_deposits")
    .select("*")
    .eq("id", depositId)
    .maybeSingle();

  if (!row || row.status !== "pending" || row.credited_at) return false;

  const creditAmount = Number(row.amount);
  const bucket = row.target_bucket as WalletBucket;

  const { error: updErr } = await admin
    .from("starpago_deposits")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      credited_at: new Date().toISOString(),
    })
    .eq("id", depositId)
    .eq("status", "pending");

  if (updErr) return false;

  try {
    await admin.rpc("wallet_apply", {
      p_user_id: row.user_id,
      p_bucket: bucket,
      p_delta: creditAmount,
      p_entry_type: "starpago_deposit",
      p_reference_id: depositId,
      p_meta: { pay_method: row.pay_method, net: row.net_php },
    });
  } catch (e) {
    console.error("[starpago] credit failed", e);
    return false;
  }

  return true;
}
