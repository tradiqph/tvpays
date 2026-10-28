import {
  normalizePhMobile,
  parseStarpagoMemberMethod,
  starpagoAmountString,
  starpagoAppId,
  starpagoConfigured,
  starpagoNotifyUrl,
  starpagoPayoutPayMethodFromMember,
  starpagoPost,
  starpagoGet,
  StarpagoRequestError,
  type StarpagoMemberMethod,
} from "@/lib/starpago";
import { withdrawalPayoutMerOrderNo } from "@/lib/withdrawals";

/** StarPago `extra.bankCode` for e-wallet payouts (not the same as `payMethod`). */
export const STARPAGO_PAYOUT_BANK_CODE_GCASH = "GCASH";
export const STARPAGO_PAYOUT_BANK_CODE_MAYA = "MAYA";

export type StarpagoPayoutStatusAction =
  | "in_progress"
  | "success"
  | "fail"
  | "frozen";

export type StarpagoEwalletPayoutDestination = {
  payMethod: string;
  bankCode: string;
  accountNo: string;
  mobile: string;
  method: StarpagoMemberMethod;
};

export function starpagoPayoutConfigured(): boolean {
  return starpagoConfigured();
}

export function mapStarpagoPayoutStatus(
  orderStatus: number,
): StarpagoPayoutStatusAction {
  if (orderStatus === 2 || orderStatus === 3) return "success";
  if (orderStatus === -1 || orderStatus === -2) return "fail";
  if (orderStatus === -4) return "frozen";
  return "in_progress";
}

const STARPAGO_PAYOUT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Matches dogogo / StarPago pay-in fallback emails (gcash.local / maya.local). */
export function starpagoPayoutExtraEmail(opts: {
  mobile: string;
  method: StarpagoMemberMethod;
  memberEmail?: string | null;
}): string {
  const trimmed = opts.memberEmail?.trim();
  if (trimmed && STARPAGO_PAYOUT_EMAIL_RE.test(trimmed)) {
    return trimmed;
  }
  const localPart = opts.mobile.replace(/\D/g, "") || "payout";
  const domain = opts.method === "maya" ? "maya.local" : "gcash.local";
  return `${localPart}@${domain}`;
}

/** GCash / Maya wallet payout routing (dogogo `resolveStarpagoPayoutDestination` e-wallet branch). */
export function resolveStarpagoEwalletPayoutDestination(opts: {
  destinationType: string;
  destinationNumber: string;
}): StarpagoEwalletPayoutDestination {
  const method = parseStarpagoMemberMethod(opts.destinationType);
  if (!method) {
    throw new StarpagoRequestError("Unsupported payout destination", {
      apiCode: 400,
      apiMsg: "Only GCash and Maya are supported",
    });
  }

  const mobile = normalizePhMobile(opts.destinationNumber.trim());
  if (!mobile) {
    throw new StarpagoRequestError("Invalid mobile number", {
      apiCode: 400,
      apiMsg: `${method === "maya" ? "Maya" : "GCash"} payout requires a valid PH mobile (09XXXXXXXXX)`,
    });
  }

  const bankCode =
    method === "maya"
      ? STARPAGO_PAYOUT_BANK_CODE_MAYA
      : STARPAGO_PAYOUT_BANK_CODE_GCASH;

  return {
    payMethod: starpagoPayoutPayMethodFromMember(method),
    bankCode,
    accountNo: mobile,
    mobile,
    method,
  };
}

type CreatePayoutData = {
  orderNo?: string;
  orderStatus?: number;
  message?: string;
};

type QueryPayoutData = {
  orderNo?: string;
  merOrderNo?: string;
  orderStatus?: number;
  message?: string;
};

export async function createStarpagoPayout(input: {
  withdrawalId: string;
  attempt: number;
  amountPhp: number;
  destinationType: string;
  destinationNumber: string;
  destinationName: string;
  memberEmail?: string | null;
}) {
  if (!starpagoPayoutConfigured()) {
    throw new Error("Payout gateway not configured");
  }

  const appId = starpagoAppId();
  if (!appId) throw new Error("StarPago is not configured");

  const dest = resolveStarpagoEwalletPayoutDestination({
    destinationType: input.destinationType,
    destinationNumber: input.destinationNumber,
  });

  const merOrderNo = withdrawalPayoutMerOrderNo(input.withdrawalId, input.attempt);
  const email = starpagoPayoutExtraEmail({
    mobile: dest.mobile,
    method: dest.method,
    memberEmail: input.memberEmail,
  });

  const body: Record<string, unknown> = {
    appId,
    merOrderNo,
    notifyUrl: starpagoNotifyUrl(),
    currency: "PHP",
    amount: starpagoAmountString(input.amountPhp),
    payMethod: dest.payMethod,
    extra: {
      accountName: input.destinationName.trim(),
      email,
      mobile: dest.mobile,
      bankCode: dest.bankCode,
      accountNo: dest.accountNo,
    },
  };

  const data = await starpagoPost<CreatePayoutData>(
    "/api/v2/payout/order/create",
    body,
  );

  const orderNo = data.orderNo?.trim() ?? "";
  if (!orderNo) {
    throw new StarpagoRequestError("StarPago did not return an order number", {
      apiCode: 400,
      apiMsg: data.message ?? undefined,
    });
  }

  return {
    merOrderNo,
    orderNo,
    orderStatus: Number(data.orderStatus ?? 0),
    message: data.message ?? null,
  };
}

export async function queryStarpagoPayout(merOrderNo: string) {
  const appId = starpagoAppId();
  if (!appId) throw new Error("not_configured");

  const data = await starpagoGet<QueryPayoutData>(
    "/api/v2/payout/order/query",
    { appId, merOrderNo },
  );

  return {
    merOrderNo: data.merOrderNo ?? merOrderNo,
    orderNo: data.orderNo ?? null,
    orderStatus: Number(data.orderStatus ?? 0),
    message: data.message ?? null,
  };
}

export function isDefinitiveStarpagoCreateFailure(err: unknown): boolean {
  return (
    err instanceof StarpagoRequestError &&
    err.apiCode === 400 &&
    Boolean(err.apiMsg?.trim())
  );
}

export function starpagoPayoutMethodLabel(method: StarpagoMemberMethod): string {
  return method === "maya" ? "Maya" : "GCash";
}
