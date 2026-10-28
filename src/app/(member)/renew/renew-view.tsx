"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { GlassCard } from "@/components/member/GlassCard";
import { formatPhp } from "@/lib/format";
import type { DramaRenewalOption } from "@/lib/drama-renewals";

type AccessPayload = {
  dramaAccessEndsAt: string | null;
  dramaAccessActive: boolean;
  renewalOptions: DramaRenewalOption[];
};

export function RenewView() {
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drama/access");
      const json = (await res.json()) as AccessPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load access");
      setAccess(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load access");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function renew(period: DramaRenewalOption["period"]) {
    setBusy(period);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/drama/renew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
    const json = (await res.json()) as {
      error?: string;
      dramaAccessEndsAt?: string;
    };
    setBusy(null);
    if (!res.ok) {
      setError(json.error ?? "Renewal failed");
      return;
    }
    setMessage("Drama access extended.");
    await load();
  }

  const endsLabel =
    access?.dramaAccessEndsAt &&
    new Date(access.dramaAccessEndsAt).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MemberHeader />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <h1 className="mb-2 text-xl font-bold text-white">Renew drama access</h1>
        <p className="mb-4 text-sm text-slate-400">
          Renewals extend movie and drama streaming only. Your membership
          earnings continue while your subscription is active.
        </p>

        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
          </div>
        )}

        {!loading && access && (
          <GlassCard className="mb-4 p-4">
            <p className="text-xs text-sky-300">Current drama access</p>
            <p className="text-lg font-bold text-white">
              {access.dramaAccessActive && endsLabel
                ? `Active until ${endsLabel}`
                : endsLabel
                  ? `Expired (last ended ${endsLabel})`
                  : "No bundled access yet"}
            </p>
          </GlassCard>
        )}

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {message && <p className="mb-3 text-sm text-emerald-400">{message}</p>}

        <ul className="space-y-3">
          {(access?.renewalOptions ?? []).map((opt) => (
            <li key={opt.period}>
              <GlassCard className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-white">{opt.label}</p>
                  <p className="text-xs text-slate-400">
                    +{opt.days} days · {opt.friendlyLength}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy != null}
                  onClick={() => void renew(opt.period)}
                  className="rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === opt.period ? "…" : formatPhp(opt.pricePhp)}
                </button>
              </GlassCard>
            </li>
          ))}
        </ul>

        <Link
          href="/subscriptions"
          className="mt-6 block text-center text-sm text-sky-300 underline"
        >
          Need a membership plan instead?
        </Link>
      </div>
    </div>
  );
}
