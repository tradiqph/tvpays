import { paymongoPayoutSecretKey } from "@/lib/paymongo-env";
import { appOrigin } from "@/lib/supabase/admin";

export function paymongoWalletConfigured(): boolean {
  return Boolean(
    paymongoPayoutSecretKey() &&
      process.env.PAYMONGO_WALLET_ACCOUNT_NUMBER?.trim() &&
      process.env.PAYMONGO_WALLET_ACCOUNT_NAME?.trim(),
  );
}

export function buildPayoutReferenceNumber(
  withdrawalId: string,
  attempt: number,
): string {
  const compact = withdrawalId.replace(/-/g, "").slice(0, 22);
  const ref = `${compact}a${attempt}`;
  return ref.length <= 30 ? ref : ref.slice(0, 30);
}

export async function createPaymongoPayout(opts: {
  withdrawalId: string;
  attempt: number;
  amountPhp: number;
  destinationNumber: string;
  destinationName: string;
  destinationBic: string;
}): Promise<{ transferId: string }> {
  const secret = paymongoPayoutSecretKey();
  const sourceNumber = process.env.PAYMONGO_WALLET_ACCOUNT_NUMBER?.trim();
  const sourceName = process.env.PAYMONGO_WALLET_ACCOUNT_NAME?.trim();
  const sourceBic = process.env.PAYMONGO_WALLET_BIC?.trim() || "PAEYPHM2XXX";
  if (!secret || !sourceNumber || !sourceName) {
    throw new Error("PayMongo wallet is not configured");
  }

  const attempt = Math.max(1, Math.floor(opts.attempt));
  const referenceNumber = buildPayoutReferenceNumber(
    opts.withdrawalId,
    attempt,
  );
  const idempotencyKey = `wd-${opts.withdrawalId}-a${attempt}`;
  const centavos = Math.round(opts.amountPhp * 100);
  const auth = Buffer.from(`${secret}:`).toString("base64");
  const callbackUrl = `${appOrigin()}/api/paymongo/payout-callback`;

  const res = await fetch("https://api.paymongo.com/v2/batch_transfers", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      transfers: [
        {
          provider: "instapay",
          amount: centavos,
          currency: "PHP",
          purpose: "Disbursement",
          description: "TvPays member withdrawal",
          reference_number: referenceNumber,
          source_account: {
            number: sourceNumber,
            name: sourceName,
            bic: sourceBic,
          },
          destination_account: {
            number: opts.destinationNumber,
            name: opts.destinationName,
            bic: opts.destinationBic,
          },
          callback_url: callbackUrl,
          metadata: {
            withdrawal_id: opts.withdrawalId,
            payout_attempt: String(attempt),
          },
        },
      ],
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    errors?: { detail?: string }[];
    data?: { id?: string; transfers?: { id?: string }[] };
    transfers?: { id?: string }[];
  };

  if (!res.ok) {
    const detail = json.errors?.[0]?.detail || `PayMongo error ${res.status}`;
    throw new Error(detail);
  }

  const transferId =
    json.data?.transfers?.[0]?.id ??
    json.transfers?.[0]?.id ??
    (json.data?.id?.startsWith("tr_") ? json.data.id : null);

  if (!transferId) {
    throw new Error("PayMongo did not return a transfer id");
  }

  return { transferId };
}

export function normalizePaymongoTransferStatus(status: string): string {
  const s = status.toLowerCase().trim();
  if (["success", "successful", "completed", "deposited", "succeeded"].includes(s)) {
    return "succeeded";
  }
  if (["returned", "cancelled", "canceled", "failed"].includes(s)) {
    return "failed";
  }
  return "pending";
}

export async function fetchPaymongoTransfer(transferId: string) {
  const secret = paymongoPayoutSecretKey();
  if (!secret) throw new Error("PayMongo payout is not configured");
  const auth = Buffer.from(`${secret}:`).toString("base64");
  const res = await fetch(
    `https://api.paymongo.com/v1/transfers/${transferId}`,
    {
      headers: { Authorization: `Basic ${auth}` },
      cache: "no-store",
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    data?: { id?: string; attributes?: { status?: string } };
  };
  if (!res.ok) throw new Error(`PayMongo fetch ${res.status}`);
  const status = normalizePaymongoTransferStatus(
    String(json.data?.attributes?.status ?? ""),
  );
  return { transferId, status };
}

export function parseTransferCallback(rawBody: string): {
  transferId: string | null;
  status: string | null;
} {
  try {
    const parsed = JSON.parse(rawBody) as {
      data?: { id?: string; attributes?: { status?: string } };
    };
    const id = parsed.data?.id ?? null;
    const status = parsed.data?.attributes?.status
      ? normalizePaymongoTransferStatus(parsed.data.attributes.status)
      : null;
    return { transferId: id, status };
  } catch {
    return { transferId: null, status: null };
  }
}
