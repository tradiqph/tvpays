"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Lock } from "lucide-react";

export type ProviderOption = { key: string; label: string };

// Per-provider orb colours; unknown providers fall back to blue.
const ORBS: Record<string, { from: string; to: string; glow: string }> = {
  anyreel: { from: "#67e8f9", to: "#0e7490", glow: "rgba(34,211,238,0.6)" },
  reelshort: { from: "#ff8a7a", to: "#c2181f", glow: "rgba(248,80,80,0.6)" },
  netshort: { from: "#7db8ff", to: "#1d4ed8", glow: "rgba(59,130,246,0.6)" },
  flickreels: { from: "#c99bff", to: "#6d28d9", glow: "rgba(167,139,250,0.6)" },
  goodshort: { from: "#6ef0a0", to: "#0f8a43", glow: "rgba(52,211,153,0.6)" },
  chillshorts: { from: "#5eead4", to: "#0f766e", glow: "rgba(45,212,191,0.6)" },
  dramabox: { from: "#ffc061", to: "#c2570c", glow: "rgba(251,146,60,0.6)" },
  dramabox_web: { from: "#ffc061", to: "#c2570c", glow: "rgba(251,146,60,0.6)" },
  netreel: { from: "#ff8ad0", to: "#a21caf", glow: "rgba(236,72,153,0.6)" },
};
const DEFAULT_ORB = { from: "#5ab8ff", to: "#1546c9", glow: "rgba(56,150,255,0.6)" };

function Orb({ id, label, size = 30 }: { id: string; label: string; size?: number }) {
  const o = ORBS[id] ?? DEFAULT_ORB;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-white/60 font-black text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `radial-gradient(circle at 35% 28%, ${o.from}, ${o.to} 75%)`,
        boxShadow: `0 0 10px ${o.glow}, inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -3px 5px rgba(0,0,0,0.3)`,
      }}
    >
      {label.charAt(0)}
    </span>
  );
}

type Props = {
  options: ProviderOption[];
  value: string;
  onChange: (key: string) => void;
  /** Trial / paywall: show in list but cannot select. */
  lockedKeys?: string[];
  onLockedSelect?: (key: string) => void;
};

/** Glossy dropdown for picking the drama provider. */
export function ProviderDropdown({
  options,
  value,
  onChange,
  lockedKeys = [],
  onLockedSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.key === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-sky-300/60 bg-gradient-to-b from-[#1b4fc4] to-[#0a2263] py-1 pl-1 pr-3"
        style={{
          boxShadow:
            "0 0 14px rgba(56,150,255,0.45), inset 0 1px 0 rgba(255,255,255,0.45)",
        }}
      >
        <Orb id={current.key} label={current.label} />
        <span className="text-left leading-tight">
          <span className="block text-[9px] font-semibold uppercase tracking-widest text-sky-200/80">
            Source
          </span>
          <span className="block text-sm font-extrabold text-white">
            {current.label}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="ml-1">
          <ChevronDown className="h-4 w-4 text-white" strokeWidth={3} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Drama source"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-sky-300/50 bg-gradient-to-b from-[#123480]/95 to-[#06143a]/95 p-1.5 backdrop-blur-md"
            style={{
              boxShadow:
                "0 12px 30px rgba(0,0,0,0.55), 0 0 18px rgba(56,150,255,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            {options.map((o) => {
              const active = o.key === current.key;
              const locked = lockedKeys.includes(o.key);
              return (
                <li key={o.key} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      if (locked) {
                        setOpen(false);
                        onLockedSelect?.(o.key);
                        return;
                      }
                      setOpen(false);
                      if (!active) onChange(o.key);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                      active
                        ? "bg-gradient-to-r from-[#2a6bff]/60 to-transparent"
                        : locked
                          ? "opacity-75 hover:bg-white/5"
                          : "hover:bg-white/10"
                    }`}
                  >
                    <Orb id={o.key} label={o.label} size={28} />
                    <span
                      className={`flex-1 text-sm ${active ? "font-extrabold text-white" : "font-semibold text-sky-100/85"}`}
                    >
                      {o.label}
                    </span>
                    {locked && (
                      <Lock className="h-3.5 w-3.5 text-amber-300/90" strokeWidth={2.5} />
                    )}
                    {active && !locked && (
                      <Check className="h-4 w-4 text-cyan-300" strokeWidth={3} />
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
