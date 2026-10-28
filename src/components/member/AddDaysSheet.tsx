"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Film, Loader2, Plus, Wallet, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DRAMA_RENEWAL_OPTIONS, type DramaRenewalPeriod } from "@/lib/drama-renewals";
import { formatDateManila, formatPhp } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful purchase so the parent can reload. */
  onPurchased: () => void;
};

const BEST: DramaRenewalPeriod = "year";

/** Bottom sheet to buy extra video-access days (week / month / year). */
export function AddDaysSheet({ open, onClose, onPurchased }: Props) {
  const [selected, setSelected] = useState<DramaRenewalPeriod>("month");
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ days: number; endsAt: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("wallets")
        .select("deposit_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setBalance(Number(data?.deposit_balance ?? 0));
    });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && close();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close is stable enough for an Escape handler
  }, [open, busy]);

  const option = DRAMA_RENEWAL_OPTIONS.find((o) => o.period === selected)!;
  const short = balance !== null && balance < option.pricePhp;

  function close() {
    if (busy) return;
    setError(null);
    setSuccess(null);
    onClose();
  }

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/drama/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: selected }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        dramaAccessEndsAt?: string;
        days?: number;
      };
      if (!res.ok || !json.dramaAccessEndsAt) {
        setError(json.error ?? "Couldn't add days. Please try again.");
        return;
      }
      setSuccess({ days: json.days ?? option.days, endsAt: json.dramaAccessEndsAt });
      setBalance((b) => (b === null ? b : b - option.pricePhp));
      onPurchased();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-days-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full overflow-hidden rounded-t-[28px] border-2 border-b-0 border-cyan-300/50 bg-gradient-to-b from-[#0f2f78] via-[#0a2263] to-[#06143a] px-4 pb-5 pt-4"
            style={{ boxShadow: "0 -10px 40px rgba(34,211,238,0.25), inset 0 1px 0 rgba(255,255,255,0.3)" }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="relative mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
            {!busy && (
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 text-sky-100"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative flex flex-col items-center py-4 text-center"
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 240 }}
                    className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-b from-[#5ef08f] to-[#0e8a3e]"
                    style={{ boxShadow: "0 0 24px rgba(52,211,153,0.6), inset 0 3px 4px rgba(255,255,255,0.5)" }}
                  >
                    <Check className="h-8 w-8 text-white" strokeWidth={3.5} />
                  </motion.span>
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-3xl font-black text-white"
                  >
                    +{success.days} days
                  </motion.p>
                  <p className="mt-1 text-sm text-sky-100/80">
                    Video access now active until {formatDateManila(success.endsAt)} (PH)
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    autoFocus
                    className="mt-5 h-11 w-full rounded-full border border-emerald-200/70 bg-gradient-to-b from-[#5ef08f] to-[#109a48] text-sm font-bold uppercase tracking-wide text-white"
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                <motion.div key="pick" exit={{ opacity: 0 }} className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/50 bg-gradient-to-b from-cyan-400 to-blue-700"
                      style={{ boxShadow: "0 0 14px rgba(34,211,238,0.5), inset 0 2px 3px rgba(255,255,255,0.5)" }}
                    >
                      <Film className="h-5 w-5 text-white" />
                    </span>
                    <div>
                      <h2 id="add-days-title" className="text-lg font-extrabold text-white">
                        Add video access days
                      </h2>
                      <p className="text-xs text-sky-100/70">Days stack on top of any time you have left.</p>
                    </div>
                  </div>

                  <ul role="radiogroup" className="space-y-2">
                    {DRAMA_RENEWAL_OPTIONS.map((o) => {
                      const active = o.period === selected;
                      const perDay = o.pricePhp / o.days;
                      return (
                        <li key={o.period}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setSelected(o.period)}
                            className={`relative flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-colors ${
                              active
                                ? "border-cyan-300 bg-gradient-to-r from-cyan-500/25 to-blue-600/10"
                                : "border-white/10 bg-white/[0.03]"
                            }`}
                            style={active ? { boxShadow: "0 0 18px rgba(34,211,238,0.35)" } : undefined}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                active ? "border-cyan-300 bg-cyan-400" : "border-white/30"
                              }`}
                            >
                              {active && <Check className="h-3 w-3 text-[#06143a]" strokeWidth={4} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="font-bold text-white">{o.label}</span>
                                {o.period === BEST && (
                                  <span className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-950">
                                    Best value
                                  </span>
                                )}
                              </span>
                              <span className="block text-xs text-sky-100/70">
                                +{o.days} days · {formatPhp(perDay)}/day
                              </span>
                            </span>
                            <span className="text-lg font-black text-white tabular-nums">{formatPhp(o.pricePhp)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-black/25 px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 text-sky-100/80">
                      <Wallet className="h-3.5 w-3.5" /> Deposit balance
                    </span>
                    <span className={`font-bold tabular-nums ${short ? "text-rose-300" : "text-white"}`}>
                      {balance === null ? "…" : formatPhp(balance)}
                    </span>
                  </div>

                  {error && (
                    <motion.p
                      key={error}
                      role="alert"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, x: [0, -6, 6, -3, 3, 0] }}
                      className="mt-2 rounded-xl border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
                    >
                      {error}
                    </motion.p>
                  )}

                  {short ? (
                    <Link
                      href="/wallet"
                      className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-amber-200/70 bg-gradient-to-b from-[#ffc83d] to-[#c77800] text-sm font-bold uppercase tracking-wide text-white"
                    >
                      <Wallet className="h-4 w-4" /> Top up to continue
                    </Link>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={buy}
                      disabled={busy || balance === null}
                      whileTap={{ scale: 0.97 }}
                      className="relative mt-4 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-cyan-200/70 bg-gradient-to-r from-cyan-400 to-blue-600 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-70"
                      style={{ boxShadow: "0 0 22px rgba(34,211,238,0.45), inset 0 1px 0 rgba(255,255,255,0.55)" }}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={3} />}
                      {busy ? "Processing…" : `Pay ${formatPhp(option.pricePhp)} · Add ${option.days} days`}
                    </motion.button>
                  )}
                  <p className="mt-2 text-center text-[10px] text-sky-100/50">
                    Paid from your deposit balance. Adds streaming days only.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
