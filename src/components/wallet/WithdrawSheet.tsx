"use client";

import { useState } from "react";
import { SlideSheet } from "@/components/member/SlideSheet";
import { AlertDialog } from "@/components/member/AlertDialog";

type Props = {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
  onSuccess: () => void;
};

export function WithdrawSheet({ open, onClose, maxAmount, onSuccess }: Props) {
  const [amount, setAmount] = useState("200");
  const [destinationType, setDestinationType] = useState("gcash");
  const [destinationNumber, setDestinationNumber] = useState("");
  const [destinationName, setDestinationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        destination_type: destinationType,
        destination_number: destinationNumber,
        destination_name: destinationName,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Withdrawal failed");
      return;
    }
    onSuccess();
    onClose();
    setSubmitted(true);
  }

  return (
    <>
    <SlideSheet open={open} onClose={onClose}>
      <form
        onSubmit={submit}
        className="rounded-t-3xl border border-emerald-500/30 bg-[#001428] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Withdraw</h2>
          <button type="button" onClick={onClose} className="text-slate-400">
            Close
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-400">
          Available: ₱{maxAmount.toFixed(2)} • 10% tax • min ₱200
        </p>
        <input
          type="number"
          min={200}
          max={maxAmount}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-3 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        />
        <select
          value={destinationType}
          onChange={(e) => setDestinationType(e.target.value)}
          className="mb-2 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="bank">Bank (InstaPay)</option>
        </select>
        <input
          required
          placeholder="Account / mobile number"
          value={destinationNumber}
          onChange={(e) => setDestinationNumber(e.target.value)}
          className="mb-2 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        />
        <input
          required
          placeholder="Account name"
          value={destinationName}
          onChange={(e) => setDestinationName(e.target.value)}
          className="mb-3 w-full rounded-xl border border-sky-800 bg-slate-950 px-3 py-2 text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-green-700 py-3 font-semibold text-white"
        >
          {loading ? "Submitting…" : "Request withdrawal"}
        </button>
      </form>
    </SlideSheet>
    <AlertDialog
      open={error != null}
      onClose={() => setError(null)}
      title="Withdrawal failed"
      message={error}
    />
    <AlertDialog
      open={submitted}
      onClose={() => setSubmitted(false)}
      tone="success"
      title="Withdrawal requested"
      message="Your request was submitted. We'll notify you once it's processed."
    />
    </>
  );
}
