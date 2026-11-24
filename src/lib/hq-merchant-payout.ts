import { createAdminClient } from "@/lib/supabase/admin";
import { clampText } from "@/lib/security/input";
import {
  normalizeGotymeAccount,
  normalizePaymongoWalletAccount,
  normalizePhMobile,
  parseHqMerchantPayoutMethod,
  starpagoUserFacingError,
  validateGcashPayerName,
  type HqMerchantPayoutMethod,
} from "@/lib/starpago";
import {
  createStarpagoMerchantPayout,
  mapStarpagoPayoutStatus,
  queryStarpagoPayout,
  starpagoPayoutConfigured,
} from "@/lib/starpago-payout";

export const HQ_MERCHANT_PAYOUT_MER_PREFIX = "TVPHQ";

export function hqMerchantPayoutMerOrderNo(payoutId: string): string {
  const compact = payoutId.replace(/-/g, "").slice(0, 24);
  return `${HQ_MERCHANT_PAYOUT_MER_PREFIX}${compact}`.slice(0, 32);
}

export function isHqMerchantPayoutMerOrderNo(merOrderNo: string): boolean {
  return merOrderNo.startsWith(HQ_MERCHANT_PAYOUT_MER_PREFIX);
}

export type HqMerchantPayoutInput = {
  amount_php: number;
  destination_type: HqMerchantPayoutMethod;
  destination_number: string;
  destination_name: string;
  destination_mobile: string;
};

export function validateHqMerchantPayoutInput(
  body: Record<string, unknown>,
):
  | { ok: true; data: HqMerchantPayoutInput }
  | { ok: false; error: string } {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter a valid amount greater than zero." };
  }

  const destType = parseHqMerchantPayoutMethod(body.destination_type);
  if (!destType) {
    return {
      ok: false,
      error: "Choose GCash, Maya, GoTyme Bank, or PayMongo wallet.",
    };
  }

  const destName = clampText(body.destination_name, 80);
  const nameErr = validateGcashPayerName(destName);
  if (nameErr) return { ok: false, error: nameErr };

  const mobile = normalizePhMobile(String(body.destination_mobile ?? "").trim());
  if (!mobile) {
    return {
      ok: false,
      error: "Enter a valid contact mobile (09XXXXXXXXX) for StarPago.",
    };
  }

  const rawNumber = String(body.destination_number ?? "").trim();
  let destinationNumber: string;
  if (destType === "gcash" || destType === "maya") {
    const account = normalizePhMobile(rawNumber);
    if (!account) {
      return {
        ok: false,
        error: "Enter a valid GCash/Maya mobile (09XXXXXXXXX).",
      };
    }
    destinationNumber = account;
  } else if (destType === "gotyme") {
    const account = normalizeGotymeAccount(rawNumber);
    if (!account) {
      return {
        ok: false,
        error: "Enter a valid 12-digit GoTyme account number (not starting with 09).",
      };
    }
    destinationNumber = account;
  } else {
    const account = normalizePaymongoWalletAccount(rawNumber);
    if (!account) {
      return {
        ok: false,
        error: "Enter a valid PayMongo wallet account number (digits only).",
      };
    }
    destinationNumber = account;
  }

  return {
    ok: true,
    data: {
      amount_php: Math.round(amount * 100) / 100,
      destination_type: destType,
      destination_number: destinationNumber,
      destination_name: destName,
      destination_mobile: mobile,
    },
  };
}

export async function dispatchHqMerchantPayout(payoutId: string) {
  if (!starpagoPayoutConfigured()) {
    throw new Error("StarPago payout is not configured");
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("hq_merchant_payouts")
    .select("*")
    .eq("id", payoutId)
    .maybeSingle();

  if (!row) throw new Error("Payout not found");
  if (row.status !== "pending") {
    throw new Error("Payout is not pending");
  }

  const merOrderNo = hqMerchantPayoutMerOrderNo(row.id);

  await admin
    .from("hq_merchant_payouts")
    .update({ starpago_mer_order_no: merOrderNo })
    .eq("id", payoutId);

  try {
    const result = await createStarpagoMerchantPayout({
      merOrderNo,
      amountPhp: Number(row.amount_php),
      destinationType: row.destination_type,
      destinationNumber: row.destination_number,
      destinationMobile: row.destination_mobile,
      destinationName: row.destination_name,
    });

    const action = mapStarpagoPayoutStatus(result.orderStatus);
    const nextStatus =
      action === "success"
        ? "completed"
        : action === "fail"
          ? "failed"
          : "processing";

    await admin
      .from("hq_merchant_payouts")
      .update({
        status: nextStatus,
        starpago_mer_order_no: result.merOrderNo,
        starpago_order_no: result.orderNo,
        starpago_order_status: result.orderStatus,
        failure_reason: action === "fail" ? result.message ?? "Payout failed" : null,
        completed_at: action === "success" ? new Date().toISOString() : null,
      })
      .eq("id", payoutId);

    return result;
  } catch (err) {
    const reason = starpagoUserFacingError(err);
    await admin
      .from("hq_merchant_payouts")
      .update({
        status: "failed",
        starpago_mer_order_no: merOrderNo,
        failure_reason: reason,
      })
      .eq("id", payoutId);
    throw err;
  }
}

export async function syncHqMerchantPayout(payoutId: string) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("hq_merchant_payouts")
    .select("id, status, starpago_mer_order_no")
    .eq("id", payoutId)
    .maybeSingle();

  if (!row?.starpago_mer_order_no) {
    throw new Error("No StarPago order to sync");
  }
  if (row.status === "completed" || row.status === "failed") {
    return row.status;
  }

  const queried = await queryStarpagoPayout(row.starpago_mer_order_no);
  const action = mapStarpagoPayoutStatus(queried.orderStatus);
  const nextStatus =
    action === "success"
      ? "completed"
      : action === "fail"
        ? "failed"
        : row.status === "pending"
          ? "processing"
          : row.status;

  await admin
    .from("hq_merchant_payouts")
    .update({
      status: nextStatus,
      starpago_order_no: queried.orderNo,
      starpago_order_status: queried.orderStatus,
      failure_reason: action === "fail" ? queried.message ?? "Payout failed" : null,
      completed_at: action === "success" ? new Date().toISOString() : null,
    })
    .eq("id", payoutId);

  return nextStatus;
}

export async function applyStarpagoPayoutToHqMerchant(merOrderNo: string) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("hq_merchant_payouts")
    .select("id, status")
    .eq("starpago_mer_order_no", merOrderNo)
    .maybeSingle();

  if (!row) return;
  if (row.status === "completed" || row.status === "failed") return;

  try {
    await syncHqMerchantPayout(row.id);
  } catch (e) {
    console.warn("[hq-merchant-payout] notify sync failed", merOrderNo, e);
  }
}

export async function syncInFlightHqMerchantPayouts() {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("hq_merchant_payouts")
    .select("id")
    .in("status", ["pending", "processing"])
    .not("starpago_mer_order_no", "is", null)
    .limit(50);

  let updated = 0;
  for (const r of rows ?? []) {
    try {
      await syncHqMerchantPayout(r.id);
      updated++;
    } catch (e) {
      console.error("[hq-merchant-payout] sync", r.id, e);
    }
  }
  return { checked: rows?.length ?? 0, updated };
}