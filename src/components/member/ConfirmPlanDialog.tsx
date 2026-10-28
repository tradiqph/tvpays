"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Check, Film, Loader2, Play, X } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/plans";
import { formatPhp } from "@/lib/format";
import { themeForPlan } from "@/lib/plan-themes";
import { PlanBadgeVisual } from "@/components/member/PlanBadgeVisual";

type Props = {
  open: boolean;
  plan: SubscriptionPlan;
  loading: boolean;
  error: string | null;
  success: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

// Fixed positions so sparkles don't jump between renders.
const SPARKLES = [
  { x: -78, y: -40, d: 0 },
  { x: 74, y: -52, d: 0.4 },
  { x: -64, y: 46, d: 0.8 },
  { x: 82, y: 30, d: 1.2 },
  { x: 0, y: -84, d: 1.6 },
  { x: -18, y: 80, d: 2 },
];

const BURST = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2);

/** Glossy confirm sheet for subscribing to a plan, with a success celebration. */
export function ConfirmPlanDialog({
  open,
  plan,
  loading,
  error,
  success,
  onConfirm,
  onClose,
}: Props) {
  const theme = themeForPlan(plan.slug);

  useEffect(() => {
    if (!open || loading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  const details = [
    { icon: Play, label: "Episodes daily", value: String(plan.adsPerDay) },
    { icon: CalendarDays, label: "Duration", value: `${plan.durationDays} days` },
    ...(plan.dramaBundleDays > 0
      ? [{ icon: Film, label: "Unlimited dramas", value: `+${plan.dramaBundleDays} days` }]
      : []),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/75 backdrop-blur-[3px]"
            onClick={() => !loading && onClose()}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-plan-title"
            initial={{ y: 120, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 80, scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="relative w-full max-w-[340px] overflow-hidden rounded-[28px] border-2 bg-gradient-to-b from-[#123480] via-[#0a2263] to-[#06143a] px-5 pb-5 pt-6 text-center"
            style={{
              borderColor: theme.heroBorder,
              boxShadow: `0 0 40px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`,
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />

            {!loading && !success && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cancel"
                className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-1.5 text-sky-100 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Badge with spinning halo, sparkles and success burst */}
            <div className="relative mx-auto mb-3 flex aspect-square w-44 max-w-[min(100%,11rem)] items-center justify-center">
              <motion.div
                className="absolute inset-2 rounded-full opacity-80 blur-[2px]"
                style={{
                  background: `conic-gradient(from 0deg, transparent, ${theme.accent}, transparent 40%, ${theme.accent}, transparent 80%)`,
                  maskImage: "radial-gradient(circle, transparent 58%, black 60%)",
                  WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 60%)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: success ? 1.2 : 4, repeat: Infinity, ease: "linear" }}
              />
              <div
                className="absolute inset-6 rounded-full blur-2xl"
                style={{ background: theme.glow }}
              />

              {SPARKLES.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-white"
                  style={{ x: s.x, y: s.y, boxShadow: `0 0 8px ${theme.accent}` }}
                  animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.4] }}
                  transition={{ duration: 2, delay: s.d, repeat: Infinity }}
                />
              ))}

              {success &&
                BURST.map((a, i) => (
                  <motion.span
                    key={`b${i}`}
                    className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                    style={{
                      background: i % 2 ? "#fde68a" : theme.accent,
                      boxShadow: `0 0 10px ${theme.accent}`,
                    }}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(a) * 95,
                      y: Math.sin(a) * 95,
                      opacity: 0,
                      scale: 0.3,
                    }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                ))}

              <motion.div
                className="relative z-10 mx-auto flex h-full w-full items-center justify-center"
                animate={
                  success ? { scale: [1, 1.1, 1.02] } : { y: [0, -4, 0] }
                }
                transition={
                  success
                    ? { duration: 0.6, ease: "easeOut" }
                    : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                }
              >
                <PlanBadgeVisual planSlug={plan.slug} variant="dialog" />
              </motion.div>

              {success && (
                <motion.div
                  className="absolute bottom-0 left-1/2 z-20 flex h-10 w-10 -translate-x-1/2 translate-y-1/3 items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-b from-[#5ef08f] to-[#0e8a3e]"
                  style={{
                    boxShadow:
                      "0 0 16px rgba(52,211,153,0.6), inset 0 2px 3px rgba(255,255,255,0.55)",
                  }}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 12, stiffness: 260, delay: 0.25 }}
                >
                  <Check className="h-5 w-5 text-white" strokeWidth={3.5} />
                </motion.div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <h2
                    id="confirm-plan-title"
                    className="text-xl font-extrabold text-white"
                  >
                    You&apos;re now {plan.name}!
                  </h2>
                  <p className="mt-1 text-sm text-sky-100/85">
                    Your subscription is active. Enjoy your episodes.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    autoFocus
                    className="mt-5 h-11 w-full rounded-full border border-emerald-200/70 bg-gradient-to-b from-[#5ef08f] to-[#109a48] text-sm font-bold uppercase tracking-wide text-white"
                    style={{
                      boxShadow:
                        "0 0 14px rgba(52,211,153,0.45), inset 0 1px 0 rgba(255,255,255,0.55)",
                    }}
                  >
                    Awesome
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  exit={{ opacity: 0, y: -8 }}
                  className="relative"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-300/80">
                    Confirm subscription
                  </p>
                  <h2
                    id="confirm-plan-title"
                    className="mt-0.5 text-xl font-extrabold text-white"
                  >
                    {plan.name}
                  </h2>
                  <p
                    className="mt-1 text-3xl font-black"
                    style={{
                      background: "linear-gradient(180deg,#fff7d1,#fbbf24 55%,#d97706)",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      filter: "drop-shadow(0 0 10px rgba(251,191,36,0.35))",
                    }}
                  >
                    {formatPhp(plan.pricePhp)}
                  </p>

                  <ul className="mt-4 space-y-1.5 text-left">
                    {details.map((d, i) => {
                      const Icon = d.icon;
                      return (
                        <motion.li
                          key={d.label}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.07 }}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ background: `${theme.accent}33` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: theme.accent }} />
                          </span>
                          <span className="flex-1 text-sm text-sky-100/85">{d.label}</span>
                          <span className="text-sm font-bold text-white">{d.value}</span>
                        </motion.li>
                      );
                    })}
                  </ul>

                  <p className="mt-3 text-[11px] text-sky-200/60">
                    {formatPhp(plan.pricePhp)} will be charged to your wallet.
                  </p>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, x: 0 }}
                        animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mt-2 rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-200"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading}
                    whileTap={{ scale: 0.97 }}
                    className="relative mt-4 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-sky-200/70 bg-gradient-to-r from-sky-400 to-blue-600 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-80"
                    style={{
                      boxShadow:
                        "0 0 22px rgba(0,150,255,0.5), inset 0 1px 0 rgba(255,255,255,0.55)",
                    }}
                  >
                    {!loading && (
                      <motion.span
                        className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                        initial={{ left: "-40%" }}
                        animate={{ left: "140%" }}
                        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
                      />
                    )}
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      "Confirm & Subscribe"
                    )}
                  </motion.button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="mt-2 h-10 w-full rounded-full text-sm font-semibold text-sky-200/80 hover:text-white disabled:opacity-40"
                  >
                    Not now
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
