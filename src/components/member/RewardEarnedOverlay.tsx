"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Coins } from "lucide-react";
import { formatPhp } from "@/lib/format";

type Props = {
  amount: number | null;
  flashKey?: number;
  label?: string;
  className?: string;
};

export function RewardEarnedOverlay({
  amount,
  flashKey = 0,
  label = "Task complete",
  className = "",
}: Props) {
  return (
    <AnimatePresence>
      {amount != null && amount > 0 && (
        <motion.div
          key={flashKey}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-[2px] ${className}`}
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            className="rounded-2xl border border-amber-300/45 bg-slate-950/95 px-10 py-7 text-center shadow-[0_0_48px_rgba(251,191,36,0.35)]"
          >
            <Coins className="mx-auto mb-2 h-11 w-11 text-amber-300" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200/90">
              {label}
            </p>
            <p className="mt-2 text-4xl font-black tabular-nums text-white">
              +{formatPhp(amount)}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
