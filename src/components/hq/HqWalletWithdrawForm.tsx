"use client";

import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { Button, ErrorNote, useHqAction } from "@/components/hq/controls";
import type { HqMerchantPayoutMethod } from "@/lib/starpago";

const METHODS: { value: HqMerchantPayoutMethod; label: string }[] = [
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "gotyme", label: "GoTyme Bank" },
  { value: "paymongo", label: "PayMongo wallet" },
];

function accountLabel(method: HqMerchantPayoutMethod): string {
  if (method === "gcash" || method === "maya") return "Account mobile (09…)";
  if (method === "gotyme") return "GoTyme account (12 digits)";
  return "PayMongo wallet account number";
}

function accountPlaceholder(method: HqMerchantPayoutMethod): string {
  if (method === "gcash" || method === "maya") return "09XXXXXXXXX";
  if (method === "gotyme") return "12-digit account";
  return "Wallet account number";
}

const fieldClass =
  "h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50 md:text-sm";

export function HqWalletWithdrawForm({
  showLocalNotifyHint = false,
}: {
  showLocalNotifyHint?: boolean;
}) {
  const { run, loading, error, setError } = useHqAction();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<HqMerchantPayoutMethod>("gcash");
  const [destinationNumber, setDestinationNumber] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [destinationMobile, setDestinationMobile] = useState("");
  const [ok, setOk] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setOk(null);
        setError(null);
        const okSubmit = await run("/api/hq/wallet/withdraw", {
          amount: Number(amount),
          destination_type: method,
          destination_number: destinationNumber,
          destination_name: destinationName,
          destination_mobile: destinationMobile,
        });
        if (okSubmit) {
          setOk("Withdrawal submitted to StarPago.");
          setAmount("");
          setDestinationNumber("");
          setDestinationName("");
          setDestinationMobile("");
        }
      }}
    >
      <MethodSelect method={method} setMethod={setMethod} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-slate-400">Amount (PHP)</span>
          <input
            type="number"
            required
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={fieldClass}
            placeholder="0.00"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-slate-400">{accountLabel(method)}</span>
          <input
            type="text"
            required
            value={destinationNumber}
            onChange={(e) => setDestinationNumber(e.target.value)}
            className={fieldClass}
            placeholder={accountPlaceholder(method)}
            inputMode={method === "gotyme" || method === "paymongo" ? "numeric" : "tel"}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-slate-400">Account holder name</span>
          <input
            type="text"
            required
            value={destinationName}
            onChange={(e) => setDestinationName(e.target.value)}
            className={fieldClass}
            placeholder="As registered with the provider"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-slate-400">Contact mobile (09…)</span>
          <input
            type="tel"
            required
            value={destinationMobile}
            onChange={(e) => setDestinationMobile(e.target.value)}
            className={fieldClass}
            placeholder="09XXXXXXXXX"
          />
        </label>
      </div>
      <p className="text-[11px] text-slate-500">
        Sends from the live StarPago merchant payout balance. Super admins only.
      </p>
      {showLocalNotifyHint && (
        <p className="text-[11px] text-amber-200/90">
          StarPago payouts need a public HTTPS notify URL. Set{" "}
          <code className="text-amber-100/90">NEXT_PUBLIC_APP_URL=https://tvpays.net</code> in
          .env.local and restart the dev server.
        </p>
      )}
      <Button type="submit" loading={loading}>
        <ArrowDownToLine className="h-4 w-4" /> Withdraw
      </Button>
      <ErrorNote error={error} />
      {ok && <p className="text-xs text-emerald-300">{ok}</p>}
    </form>
  );
}

function MethodSelect({
  method,
  setMethod,
}: {
  method: HqMerchantPayoutMethod;
  setMethod: (m: HqMerchantPayoutMethod) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">Destination</span>
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as HqMerchantPayoutMethod)}
        className="h-10 w-full rounded-xl border border-white/10 bg-[#0a1630] px-3 text-base text-slate-200 md:text-sm"
      >
        {METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function HqMerchantPayoutsSyncButton() {
  const { run, loading, error } = useHqAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        loading={loading}
        onClick={() => run("/api/hq/wallet/payouts/sync", {})}
      >
        Sync statuses
      </Button>
      <ErrorNote error={error} />
    </div>
  );
}