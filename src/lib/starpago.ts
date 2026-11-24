import { createHash } from "crypto";
import { appOrigin } from "@/lib/supabase/admin";

export const STARPAGO_EWALLET_FEE_RATE = 0.045;
export const STARPAGO_MIN_AMOUNT_PHP = 100;
/** Pay-in (collection) order create */
export const STARPAGO_PAY_METHOD_GCASH = "PH_GCASH";
export const STARPAGO_PAY_METHOD_MAYA = "PH_MAYA";

/** Payout (disbursement) order create — distinct from pay-in codes */
export const STARPAGO_PAYOUT_PAY_METHOD_GCASH = "PH_DF_GCASH";
export const STARPAGO_PAYOUT_PAY_METHOD_MAYA = "PH_DF_MAYA";

export type StarpagoMemberMethod = "gcash" | "maya";

export function parseStarpagoMemberMethod(
  input: unknown,
): StarpagoMemberMethod | null {
  const s = String(input ?? "")
    .trim()
    .toLowerCase();
  if (s === "gcash" || s === "maya") return s;
  return null;
}

/** Withdrawal destinations: e-wallets plus GoTyme Bank (bank account number, not a mobile). */
export type WithdrawMethod = StarpagoMemberMethod | "gotyme";

export function parseWithdrawMethod(input: unknown): WithdrawMethod | null {
  const s = String(input ?? "")
    .trim()
    .toLowerCase();
  if (s === "gcash" || s === "maya" || s === "gotyme") return s;
  return null;
}

/** HQ merchant payout destinations (includes PayMongo wallet via StarPago bank code). */
export type HqMerchantPayoutMethod = WithdrawMethod | "paymongo";

export function parseHqMerchantPayoutMethod(
  input: unknown,
): HqMerchantPayoutMethod | null {
  const s = String(input ?? "")
    .trim()
    .toLowerCase();
  if (s === "gcash" || s === "maya" || s === "gotyme" || s === "paymongo") {
    return s;
  }
  return null;
}

export function hqMerchantPayoutMethodLabel(method: string): string {
  if (method === "maya") return "Maya";
  if (method === "gotyme") return "GoTyme Bank";
  if (method === "paymongo") return "PayMongo wallet";
  return "GCash";
}

export function withdrawMethodLabel(method: string): string {
  if (method === "paymongo") return "PayMongo wallet";
  if (method === "maya") return "Maya";
  if (method === "gotyme") return "GoTyme Bank";
  return "GCash";
}

export const PAYMONGO_WALLET_ACCOUNT_MIN_DIGITS = 10;
export const PAYMONGO_WALLET_ACCOUNT_MAX_DIGITS = 32;

export function normalizePaymongoWalletAccount(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (
    digits.length < PAYMONGO_WALLET_ACCOUNT_MIN_DIGITS ||
    digits.length > PAYMONGO_WALLET_ACCOUNT_MAX_DIGITS
  ) {
    return null;
  }
  return digits;
}

/** Payout payMethod for GoTyme (bank transfer). Override via env if StarPago assigns a different code. */
export const STARPAGO_PAYOUT_PAY_METHOD_GOTYME =
  process.env.STARPAGO_PAYOUT_PAY_METHOD_GOTYME?.trim() || "PH_DF_BANK";

export const GOTYME_ACCOUNT_MIN_DIGITS = 12;
export const GOTYME_ACCOUNT_MAX_DIGITS = 12;
export const GOTYME_ACCOUNT_RULE_MESSAGE =
  "GoTyme account number is not a mobile number — it must not start with 09";

/**
 * Digits only for a GoTyme account number. Refuses a leading "09" (a mobile
 * number) by dropping the "9" so the user cannot continue typing that pattern.
 */
export function filterGotymeAccountDigits(input: string): string {
  let digits = input.replace(/\D/g, "").slice(0, GOTYME_ACCOUNT_MAX_DIGITS);
  if (digits.startsWith("09")) digits = "0";
  return digits;
}

export function normalizeGotymeAccount(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("09")) return null;
  if (digits.length !== GOTYME_ACCOUNT_MIN_DIGITS) return null;
  return digits;
}

/** StarPago bank payout `extra.mobile` when account is not a PH mobile. */
export function gotymePayoutMobileFromAccount(accountNo: string): string {
  const mobile = normalizePhMobile(accountNo);
  if (mobile) return mobile;
  const digits = accountNo.replace(/\D/g, "");
  const fallback = digits.slice(-11);
  return fallback || accountNo;
}

export function starpagoPayMethodFromMember(method: StarpagoMemberMethod): string {
  return method === "maya" ? STARPAGO_PAY_METHOD_MAYA : STARPAGO_PAY_METHOD_GCASH;
}

export function starpagoPayoutPayMethodFromMember(
  method: StarpagoMemberMethod,
): string {
  return method === "maya"
    ? STARPAGO_PAYOUT_PAY_METHOD_MAYA
    : STARPAGO_PAYOUT_PAY_METHOD_GCASH;
}

export function starpagoEwalletLabel(method: StarpagoMemberMethod): string {
  return method === "maya" ? "Maya" : "GCash";
}

export function starpagoApiUrl(): string {
  return (
    process.env.STARPAGO_API_URL?.trim() || "https://ph.api.starpago.com"
  ).replace(/\/$/, "");
}

export function starpagoAppId(): string | undefined {
  return process.env.STARPAGO_APP_ID?.trim() || undefined;
}

export function starpagoAppSecret(): string | undefined {
  return process.env.STARPAGO_APP_SECRET?.trim() || undefined;
}

export function starpagoConfigured(): boolean {
  return Boolean(starpagoAppId() && starpagoAppSecret());
}

export function starpagoRelayUrl(): string | undefined {
  const url = process.env.STARPAGO_RELAY_URL?.trim();
  return url ? url.replace(/\/$/, "") : undefined;
}

export function starpagoRelaySecret(): string | undefined {
  return process.env.STARPAGO_RELAY_SECRET?.trim() || undefined;
}

export function starpagoUsesRelay(): boolean {
  return Boolean(starpagoRelayUrl());
}

export function starpagoCallbackIps(): string[] {
  const raw = process.env.STARPAGO_CALLBACK_IPS?.trim() || "54.151.137.174";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function assertRelayCredentials(): void {
  if (!starpagoUsesRelay()) return;
  if (!starpagoRelaySecret()) {
    throw new Error("STARPAGO_RELAY_URL set but STARPAGO_RELAY_SECRET missing");
  }
}

function relayForwardUrl(apiPath: string, queryString?: string): string {
  const base = starpagoRelayUrl()!;
  const url = new URL(`${base}/forward`);
  url.searchParams.set("path", apiPath.startsWith("/") ? apiPath : `/${apiPath}`);
  if (queryString) url.searchParams.set("query", queryString);
  return url.toString();
}

function relayRequestHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  assertRelayCredentials();
  return { ...extra, Authorization: `Bearer ${starpagoRelaySecret()!}` };
}

export function starpagoEwalletFeeForAmount(amountPhp: number) {
  const fee_php =
    Math.round(amountPhp * STARPAGO_EWALLET_FEE_RATE * 100) / 100;
  return {
    fee_rate: STARPAGO_EWALLET_FEE_RATE,
    fee_php,
    net_php: Math.round((amountPhp - fee_php) * 100) / 100,
  };
}

export function isStarpagoPaidStatus(status: number): boolean {
  return status === 2 || status === 3;
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

function parseExtraForSign(ext: unknown): string | null {
  if (!ext || typeof ext !== "object" || Array.isArray(ext)) return null;
  const record = ext as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const value = record[key];
    if (isBlank(value)) continue;
    if (value && typeof value === "object") {
      parts.push(`${key}=${JSON.stringify(value)}`);
    } else {
      parts.push(`${key}=${String(value)}`);
    }
  }
  return parts.length ? parts.join("&") : null;
}

export function starpagoSign(
  params: Record<string, unknown>,
  appSecret: string,
): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "sign" && !isBlank(params[k]))
    .sort();
  const parts: string[] = [];
  for (const key of keys) {
    const value = params[key];
    if (key === "extra") {
      const extraStr = parseExtraForSign(value);
      if (extraStr) parts.push(`${key}=${extraStr}`);
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      parts.push(`${key}=${JSON.stringify(value)}`);
    } else {
      parts.push(`${key}=${String(value)}`);
    }
  }
  parts.push(`key=${appSecret}`);
  return createHash("sha256")
    .update(parts.join("&"), "utf8")
    .digest("hex");
}

export function starpagoVerify(
  payload: Record<string, unknown>,
  appSecret: string,
): boolean {
  const given = payload.sign;
  if (typeof given !== "string" || !given.trim()) return false;
  return starpagoSign(payload, appSecret) === given.trim();
}

export function starpagoNotifyUrl(): string {
  return `${appOrigin()}/api/starpago/notify`;
}

export function generateMerOrderNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TVP${ts}${rand}`.slice(0, 32);
}

export function normalizePhMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) return digits;
  if (digits.length === 12 && digits.startsWith("639")) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  return null;
}

/** Digits only, max 11 — for mobile inputs (09XXXXXXXXX). */
export function filterPhMobileDigits(input: string): string {
  return input.replace(/\D/g, "").slice(0, 11);
}

/** Letters and spaces only — for e-wallet account holder name. */
export function filterPayerNameLetters(input: string): string {
  return input.replace(/[^\p{L}\s]/gu, "");
}

export function validateGcashPayerName(name: string): string | null {
  const t = name.trim().replace(/\s+/g, " ");
  if (t.length < 2) return "Enter the name on your e-wallet account";
  if (t.length > 80) return "Name is too long";
  if (!/^[\p{L}\s]+$/u.test(t)) {
    return "Account name must use letters only (no numbers)";
  }
  return null;
}

export function starpagoAmountString(amountPhp: number): string {
  const rounded = Math.round(amountPhp * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2);
}

type StarpagoApiEnvelope<T> = {
  code: number;
  msg?: string;
  error?: string;
  data?: T;
};

export type StarpagoCreateOrderData = {
  orderStatus?: number;
  orderNo?: string;
  params?: Record<string, unknown> | string;
  message?: string;
};

export class StarpagoRequestError extends Error {
  httpStatus?: number;
  apiCode?: number;
  apiMsg?: string;

  constructor(message: string, opts?: { httpStatus?: number; apiCode?: number; apiMsg?: string }) {
    super(message);
    this.name = "StarpagoRequestError";
    this.httpStatus = opts?.httpStatus;
    this.apiCode = opts?.apiCode;
    this.apiMsg = opts?.apiMsg;
  }
}

/** StarPago `msg` / `error` for UI and logs; avoids generic "Payment gateway error". */
export function starpagoUserFacingError(err: unknown): string {
  if (err instanceof StarpagoRequestError) {
    const api = err.apiMsg?.trim();
    if (api) return api;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function starpagoErrorDebugPayload(
  err: unknown,
): { apiCode?: number } | undefined {
  if (process.env.NODE_ENV !== "development") return undefined;
  if (err instanceof StarpagoRequestError && err.apiCode != null) {
    return { apiCode: err.apiCode };
  }
  return undefined;
}

/** Payout notifyUrl must be public HTTPS (StarPago rejects localhost). */
export function starpagoPayoutNotifyOriginOk(): boolean {
  const origin = appOrigin();
  return origin.startsWith("https://") && !/localhost|127\.0\.0\.1/i.test(origin);
}

async function parseStarpagoResponse<T>(path: string, res: Response): Promise<T> {
  const text = await res.text();
  let json: StarpagoApiEnvelope<T>;
  try {
    json = JSON.parse(text) as StarpagoApiEnvelope<T>;
  } catch {
    const trimmed = text.trim();
    const relayRejected =
      trimmed === "invalid path" ||
      (res.status === 400 && trimmed.length < 64 && /nginx/i.test(res.headers.get("server") ?? ""));
  const relayMsg = relayRejected
    ? "StarPago relay blocked this API path. Allow payout create/query on the relay (see relay/starpago/README.md)."
    : undefined;
    console.error("[starpago] non-json response", {
      path,
      status: res.status,
      head: text.slice(0, 500),
    });
    throw new StarpagoRequestError("Payment gateway unreachable", {
      httpStatus: res.status,
      apiMsg: relayMsg,
    });
  }
  if (json.code !== 0 || !json.data) {
    console.error("[starpago] api error", {
      path,
      status: res.status,
      code: json.code,
      msg: json.msg,
      error: json.error,
    });
    throw new StarpagoRequestError("Payment gateway error", {
      httpStatus: res.status,
      apiCode: json.code,
      apiMsg: json.msg ?? json.error,
    });
  }
  return json.data;
}

const STARPAGO_FETCH_HEADERS = {
  "Content-Type": "application/json;charset=utf-8",
  Accept: "application/json",
} as const;

export async function starpagoPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const secret = starpagoAppSecret();
  if (!secret) throw new Error("not_configured");
  const signed = { ...body, sign: starpagoSign(body, secret) };
  const res = starpagoUsesRelay()
    ? await fetch(relayForwardUrl(path), {
        method: "POST",
        headers: relayRequestHeaders({ ...STARPAGO_FETCH_HEADERS }),
        body: JSON.stringify(signed),
      })
    : await fetch(`${starpagoApiUrl()}${path}`, {
        method: "POST",
        headers: STARPAGO_FETCH_HEADERS,
        body: JSON.stringify(signed),
      });
  return parseStarpagoResponse<T>(path, res);
}

export async function starpagoGet<T>(
  path: string,
  query: Record<string, string>,
): Promise<T> {
  const secret = starpagoAppSecret();
  const appId = starpagoAppId();
  if (!secret || !appId) throw new Error("not_configured");
  const params: Record<string, unknown> = { appId, ...query };
  params.sign = starpagoSign(params, secret);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const queryString = qs.toString();
  const res = starpagoUsesRelay()
    ? await fetch(relayForwardUrl(path, queryString), {
        method: "GET",
        headers: relayRequestHeaders({ Accept: "application/json" }),
        cache: "no-store",
      })
    : await fetch(`${starpagoApiUrl()}${path}?${queryString}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
  return parseStarpagoResponse<T>(path, res);
}

function normalizePayinParams(raw: StarpagoCreateOrderData["params"]) {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw;
}

export async function createPayinOrder(input: {
  payMethod: string;
  merOrderNo: string;
  amountPhp: number;
  email: string;
  mobile: string;
  accountName: string;
  attach?: string;
  returnUrl: string;
}) {
  const appId = starpagoAppId();
  if (!appId) throw new Error("not_configured");
  const body: Record<string, unknown> = {
    appId,
    merOrderNo: input.merOrderNo,
    notifyUrl: starpagoNotifyUrl(),
    currency: "PHP",
    amount: starpagoAmountString(input.amountPhp),
    payMethod: input.payMethod,
    extra: {
      email: input.email.trim(),
      mobile: input.mobile,
      accountName: input.accountName.trim(),
    },
    returnUrl: input.returnUrl,
  };
  if (input.attach?.trim()) body.attach = input.attach.trim();

  const data = await starpagoPost<StarpagoCreateOrderData>(
    "/api/v2/payment/order/create",
    body,
  );
  const params = normalizePayinParams(data.params);
  const paymentLink =
    [params.paymentLink, params.url, params.paymentUrl].find(
      (v) => typeof v === "string" && v.trim(),
    )?.toString().trim() ?? "";

  if (!data.orderNo || !paymentLink) {
    throw new StarpagoRequestError("Missing payment link from gateway");
  }

  return {
    orderNo: data.orderNo,
    paymentLink,
    orderStatus: Number(data.orderStatus ?? 0),
  };
}

type StarpagoMerchantBalanceData = {
  currency?: string;
  payinValue?: number;
  payoutValue?: number;
  disableValue?: number;
};

export type StarpagoMerchantBalance = {
  currency: string;
  payinValue: number;
  payoutValue: number;
  disableValue: number;
};

/** Live merchant balances from StarPago (`GET /api/v2/merchant/balance`). */
export async function queryStarpagoMerchantBalance(): Promise<StarpagoMerchantBalance> {
  if (!starpagoConfigured()) {
    throw new StarpagoRequestError("StarPago is not configured", { apiCode: 400 });
  }
  // PH balance: sign with appId only (currency in query breaks signature on ph.api.starpago.com).
  const data = await starpagoGet<StarpagoMerchantBalanceData>(
    "/api/v2/merchant/balance",
    {},
  );
  return {
    currency: data.currency?.trim() || "PHP",
    payinValue: Number(data.payinValue ?? 0),
    payoutValue: Number(data.payoutValue ?? 0),
    disableValue: Number(data.disableValue ?? 0),
  };
}

export function clientIpFromRequest(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || null;
}

export function isStarpagoCallbackIpAllowed(ip: string | null): boolean {
  if (!ip) return false;
  const allow = starpagoCallbackIps();
  if (allow.length === 0) return true;
  return allow.includes(ip);
}
