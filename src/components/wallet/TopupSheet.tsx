"use client";

import { useState } from "react";
import { SlideSheet } from "@/components/member/SlideSheet";
import { AlertDialog } from "@/components/member/AlertDialog";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function TopupSheet({ open, onClose }: Props) {
  const [amount, setAmount] = useState("500");
  const [method, setMethod] = useState<"gcash" | "maya">("gcash");
  const bucket = "deposit" as const;
  const [mobile, setMobile] = useState("");
  const [accountName, setAccountName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        method,
        target_bucket: bucket,
        mobile,
        account_name: accountName,
      }),
    });
    const json = (await res.json()) as { error?: string; payment_link?: string };
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Could not start payment");
      return;
    }
    if (json.payment_link) {
      window.location.href = json.payment_link;
    }
  }

  return (
    <>
    <SlideSheet open={open} onClose={onClose}>
      <form
        onSubmit={submit}
        className="rounded-t-3xl border border-sky-500/30 bg-[#001428] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Top up</h2>
          <button type="button" onClick={onClose} className="text-slate-400">
            Close
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Funds are added to your <span className="text-sky-200">deposit balance</span>.
        </p>
        <label className="text-xs text-slate-400">Amount (min ₱500)</label>
        <input
          type="number"
          min={500}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-3 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        />
        <div className="mb-3 flex gap-2">
          {(["gcash", "maya"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg py-2 text-sm uppercase ${
                method === m ? "bg-emerald-600 text-white" : "bg-slate-900"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          required
          placeholder="Mobile 09XXXXXXXXX"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="mb-2 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        />
        <input
          required
          placeholder="Name on e-wallet"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          className="mb-3 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 py-3 font-semibold text-white"
        >
          {loading ? "Starting…" : "Continue to payment"}
        </button>
      </form>
    </SlideSheet>
    <AlertDialog
      open={error != null}
      onClose={() => setError(null)}
      title="Top up failed"
      message={error}
    />
    </>
  );
}
