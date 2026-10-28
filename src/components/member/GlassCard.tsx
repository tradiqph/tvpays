"use client";

import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

type Accent = "blue" | "purple" | "green" | "gold" | "cyan";

const accents: Record<Accent, { border: string; shadow: string }> = {
  blue: {
    border: "border-sky-400/55",
    shadow: "0 0 24px rgba(0, 150, 255, 0.28)",
  },
  purple: {
    border: "border-fuchsia-400/50",
    shadow: "0 0 24px rgba(192, 38, 211, 0.25)",
  },
  green: {
    border: "border-emerald-400/50",
    shadow: "0 0 24px rgba(34, 197, 94, 0.25)",
  },
  gold: {
    border: "border-amber-400/50",
    shadow: "0 0 24px rgba(251, 191, 36, 0.22)",
  },
  cyan: {
    border: "border-cyan-400/55",
    shadow: "0 0 28px rgba(0, 200, 255, 0.35)",
  },
};

type Props = {
  children: ReactNode;
  accent?: Accent;
  className?: string;
  style?: CSSProperties;
  glow?: boolean;
};

export function GlassCard({
  children,
  accent = "blue",
  className = "",
  style,
  glow = true,
}: Props) {
  const a = accents[accent];
  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      className={`rounded-2xl border bg-slate-950/45 backdrop-blur-md ${a.border} ${className}`}
      style={{
        ...style,
        boxShadow: glow ? a.shadow : undefined,
      }}
    >
      {children}
    </motion.div>
  );
}
