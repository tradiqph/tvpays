"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

/** Glowing pill button with a circled chevron on the right. */
export function GlowButton({ children, onClick, disabled, className = "" }: Props) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`relative flex h-14 w-full items-center justify-center rounded-full border-2 border-sky-300/80 bg-gradient-to-b from-[#3fa9ff] via-[#1f6bff] to-[#1340c9] text-[15px] font-bold uppercase tracking-[0.14em] text-white disabled:opacity-60 ${className}`}
      style={{
        boxShadow:
          "0 0 22px rgba(56,160,255,0.65), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -6px 12px rgba(0,20,90,0.35)",
      }}
    >
      <span className="drop-shadow">{children}</span>
      <span className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/90">
        <ChevronRight className="h-4 w-4" strokeWidth={3} />
      </span>
    </motion.button>
  );
}
