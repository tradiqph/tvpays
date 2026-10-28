"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type Tone = "blue" | "gold" | "purple" | "green" | "magenta" | "slate" | "red";

export const TONES: Record<
  Tone,
  { tile: string; icon: string; row: string; glow: string }
> = {
  blue: {
    tile: "from-[#5ab8ff] to-[#1546c9]",
    icon: "text-white",
    row: "border-sky-400/45",
    glow: "rgba(56,150,255,0.55)",
  },
  gold: {
    tile: "from-[#ffd85a] to-[#b86a00]",
    icon: "text-amber-50",
    row: "border-amber-400/45",
    glow: "rgba(251,191,36,0.55)",
  },
  purple: {
    tile: "from-[#c08cff] to-[#5b21b6]",
    icon: "text-white",
    row: "border-violet-400/45",
    glow: "rgba(167,139,250,0.55)",
  },
  green: {
    tile: "from-[#5ef08f] to-[#0e8a3e]",
    icon: "text-white",
    row: "border-emerald-400/45",
    glow: "rgba(52,211,153,0.55)",
  },
  magenta: {
    tile: "from-[#ff7ac6] to-[#b0136e]",
    icon: "text-white",
    row: "border-pink-400/45",
    glow: "rgba(236,72,153,0.55)",
  },
  slate: {
    tile: "from-[#5b6b8c] to-[#1a2236]",
    icon: "text-white",
    row: "border-slate-400/40",
    glow: "rgba(148,163,184,0.45)",
  },
  red: {
    tile: "from-[#ff6b7d] to-[#9b1030]",
    icon: "text-white",
    row: "border-rose-400/45",
    glow: "rgba(244,63,94,0.55)",
  },
};

/** Glossy rounded icon tile: gradient body, top shine, coloured glow. */
export function GlossIcon({
  icon: Icon,
  tone,
  size = "h-11 w-11",
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/40 bg-gradient-to-b ${t.tile} ${size}`}
      style={{
        boxShadow: `0 0 12px ${t.glow}, inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -4px 6px rgba(0,0,0,0.3)`,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0.5 top-0.5 h-1/2 rounded-t-lg bg-gradient-to-b from-white/40 to-transparent" />
      <Icon
        className={`relative h-5 w-5 fill-white/25 drop-shadow ${t.icon}`}
        strokeWidth={2.2}
      />
    </div>
  );
}

/** Dark glossy glass panel used for the profile card, stats and menu rows. */
export function GlossPanel({
  children,
  className = "",
  border = "border-sky-400/45",
}: {
  children: ReactNode;
  className?: string;
  border?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-[#123480]/75 to-[#071a4a]/85 ${border} ${className}`}
      style={{
        boxShadow:
          "0 0 16px rgba(40,120,255,0.22), inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}
