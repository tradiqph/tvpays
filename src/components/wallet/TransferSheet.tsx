"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { SlideSheet } from "@/components/member/SlideSheet";
import { formatPhp } from "@/lib/format";
import type { WalletTransferDirection } from "@/lib/wallet-transfer";

type Props = {
  open: boolean;
  onClose: () => void;
  direction: WalletTransferDirection;
  depositBalance: number;
  withdrawalBalance: number;
  onSuccess: () => void;
};

export function TransferSheet({
  open,
  onClose,
  direction,
  depositBalance,
  withdrawalBalance,
  onSuccess,
}: Props) {
  const fromDeposit = direction === "deposit_to_withdrawal";
  const fromBalance = fromDeposit ? depositBalance : withdrawalBalance;
  const toLabel = fromDeposit ? "withdrawal" : "deposit";
  const fromLabel = fromDeposit ? "deposit" : "withdrawal";

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setError(null);
  }, [open, direction]);

  function setMax() {
    setAmount(String(Math.floor(fromBalance * 100) / 100));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (value > fromBalance + 0.001) {
      setError("Amount exceeds your available balance");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/wallet/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, amount: value }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Transfer failed");
      return;
    }
    onSuccess();
    onClose();
  }

  return (
    <SlideSheet open={open} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-4 pb-8">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-200">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Move balance</h2>
            <p className="text-xs text-slate-400">
              From {fromLabel} → {toLabel} wallet
            </p>
          </div>
        </div>

        <p className="rounded-xl border border-white/10 bg-[#0a1638]/80 px-3 py-2 text-sm text-slate-300">
          Available in {fromLabel}:{" "}
          <span className="font-bold text-white">{formatPhp(fromBalance)}</span>
        </p>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Amount (₱)
          </span>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min={1}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-sky-400/30 bg-[#06153f] px-3 py-2.5 text-white outline-none focus:border-sky-400"
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={setMax}
              className="shrink-0 rounded-xl border border-sky-400/40 px-3 text-xs font-bold text-sky-200"
            >
              Max
            </button>
          </div>
        </label>

        {error && (
          <p className="text-sm font-medium text-rose-300" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || fromBalance <= 0}
          className="w-full rounded-xl bg-gradient-to-b from-sky-400 to-blue-700 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {loading ? "Moving…" : "Confirm transfer"}
        </button>
      </form>
    </SlideSheet>
  );
}
