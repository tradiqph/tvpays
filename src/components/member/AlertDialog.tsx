"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type AlertTone = "error" | "warning" | "success" | "info";

const TONES: Record<
  AlertTone,
  { icon: LucideIcon; orb: string; border: string; glow: string; button: string }
> = {
  error: {
    icon: XCircle,
    orb: "from-[#ff7a8a] to-[#b3122e]",
    border: "border-rose-300/60",
    glow: "rgba(244,63,94,0.45)",
    button: "from-[#ff6b7d] to-[#c0163a] border-rose-200/70",
  },
  warning: {
    icon: AlertTriangle,
    orb: "from-[#ffd85a] to-[#c26a00]",
    border: "border-amber-300/60",
    glow: "rgba(251,191,36,0.45)",
    button: "from-[#ffc83d] to-[#c77800] border-amber-100/70",
  },
  success: {
    icon: CheckCircle2,
    orb: "from-[#5ef08f] to-[#0e8a3e]",
    border: "border-emerald-300/60",
    glow: "rgba(52,211,153,0.45)",
    button: "from-[#5ef08f] to-[#109a48] border-emerald-200/70",
  },
  info: {
    icon: Info,
    orb: "from-[#5ab8ff] to-[#1546c9]",
    border: "border-sky-300/60",
    glow: "rgba(56,150,255,0.45)",
    button: "from-[#4fb4ff] to-[#1560e8] border-sky-200/70",
  },
};

export type AlertAction = {
  label: string;
  onClick: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: ReactNode;
  tone?: AlertTone;
  /** Primary button; defaults to an "OK" that closes the dialog. */
  action?: AlertAction;
  /** Optional secondary button (e.g. "Cancel"), rendered as an outline. */
  secondary?: AlertAction;
};

/** Centered glossy modal for errors, warnings, confirmations and notices. */
export function AlertDialog({
  open,
  onClose,
  title,
  message,
  tone = "error",
  action,
  secondary,
}: Props) {
  const t = TONES[tone];
  const Icon = t.icon;
  const primary = action ?? { label: "OK", onClick: onClose };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="alert-dialog-title"
            initial={{ scale: 0.9, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className={`relative w-full max-w-[320px] overflow-hidden rounded-3xl border-2 bg-gradient-to-b from-[#123480] via-[#0a2263] to-[#06143a] px-5 pb-5 pt-7 text-center ${t.border}`}
            style={{
              boxShadow: `0 0 30px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`,
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />

            <div
              className={`relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/60 bg-gradient-to-b ${t.orb}`}
              style={{
                boxShadow: `0 0 20px ${t.glow}, inset 0 3px 4px rgba(255,255,255,0.55), inset 0 -5px 8px rgba(0,0,0,0.3)`,
              }}
            >
              <Icon className="h-8 w-8 text-white drop-shadow" strokeWidth={2.4} />
            </div>

            <h2
              id="alert-dialog-title"
              className="relative text-lg font-extrabold text-white"
            >
              {title}
            </h2>
            {message && (
              <div className="relative mt-1.5 text-sm leading-relaxed text-sky-100/85">
                {message}
              </div>
            )}

            <div className="relative mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={primary.onClick}
                autoFocus
                className={`h-11 rounded-full border bg-gradient-to-b text-sm font-bold uppercase tracking-wide text-white ${t.button}`}
                style={{
                  boxShadow: `0 0 14px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.55)`,
                }}
              >
                {primary.label}
              </button>
              {secondary && (
                <button
                  type="button"
                  onClick={secondary.onClick}
                  className="h-11 rounded-full border border-sky-300/40 bg-[#0b1d4d]/80 text-sm font-semibold text-sky-100"
                >
                  {secondary.label}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
