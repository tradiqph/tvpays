"use client";

import { useState } from "react";

export function WithdrawalRowActions({ withdrawalId }: { withdrawalId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function pay() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/hq/withdrawals/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawal_id: withdrawalId }),
    });
    const json = (await res.json()) as { error?: string; transferId?: string };
    setLoading(false);
    setMsg(res.ok ? `Processing (${json.transferId})` : json.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  async function sync() {
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/hq/withdrawals/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawal_id: withdrawalId }),
    });
    const json = (await res.json()) as { error?: string; status?: string };
    setLoading(false);
    setMsg(res.ok ? `Status: ${json.status}` : json.error ?? "Failed");
    if (res.ok) window.location.reload();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={pay}
          className="rounded bg-sky-600 px-2 py-1 text-xs text-white disabled:opacity-50"
        >
          Pay (PayMongo)
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={sync}
          className="rounded border border-slate-600 px-2 py-1 text-xs disabled:opacity-50"
        >
          Sync
        </button>
      </div>
      {msg && <span className="text-[10px] text-slate-400">{msg}</span>}
    </div>
  );
}
