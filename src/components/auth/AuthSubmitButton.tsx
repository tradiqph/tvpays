"use client";

import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";

export function AuthSubmitButton({
  loading,
  disabled = false,
  children,
}: {
  loading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const inactive = loading || disabled;
  return (
    <motion.button
      type="submit"
      disabled={inactive}
      initial="rest"
      animate="rest"
      whileHover={inactive ? undefined : "hover"}
      whileTap={{ scale: 0.97 }}
      className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full border border-sky-200/60 bg-gradient-to-r from-sky-400 via-sky-500 to-blue-700 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_0_28px_rgba(37,99,235,0.5),inset_0_1px_0_rgba(255,255,255,0.5)] disabled:opacity-70"
    >
      {!inactive && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
          initial={{ left: "-40%" }}
          animate={{ left: "140%" }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2 }}
        />
      )}
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : null}
      <span className="relative">{children}</span>
      {!inactive && (
        <motion.span
          className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white/20"
          variants={{ rest: { x: 0 }, hover: { x: 4 } }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </motion.span>
      )}
    </motion.button>
  );
}
