"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Flame, Sparkles } from "lucide-react";
import type { DramaSection } from "@/lib/shortdrama";

/** Genre chips run a keyword search, so they work on any source that supports search. */
export const DRAMA_GENRES: { label: string; q: string }[] = [
  { label: "Romance", q: "love" },
  { label: "CEO", q: "ceo" },
  { label: "Revenge", q: "revenge" },
  { label: "Billionaire", q: "billionaire" },
  { label: "Werewolf", q: "werewolf" },
  { label: "Hidden Identity", q: "identity" },
  { label: "Rebirth", q: "rebirth" },
  { label: "Betrayal", q: "betrayal" },
  { label: "Marriage", q: "marriage" },
  { label: "Family", q: "family" },
  { label: "Mafia", q: "mafia" },
  { label: "Fantasy", q: "fantasy" },
];

export type CategoryKey = "home" | `s:${string}` | `g:${string}` | "search";

type Props = {
  value: CategoryKey;
  sections: DramaSection[];
  showGenres: boolean;
  onChange: (key: CategoryKey) => void;
};

/** Horizontally scrolling category bar: For You, provider sections, then genres. */
export function CategoryChips({ value, sections, showGenres, onChange }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the selected chip in view when it changes.
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [value]);

  const chips: { key: CategoryKey; label: string; icon?: typeof Flame }[] = [
    { key: "home", label: "For You", icon: Sparkles },
    ...sections.map((s) => ({ key: `s:${s.id}` as CategoryKey, label: s.name })),
    ...(showGenres ? DRAMA_GENRES.map((g) => ({ key: `g:${g.q}` as CategoryKey, label: g.label })) : []),
  ];
  if (chips.length <= 1) return null;

  return (
    <div
      ref={scroller}
      role="tablist"
      aria-label="Drama categories"
      className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {chips.map((c, i) => {
        const active = c.key === value;
        const Icon = c.icon;
        const firstGenre = showGenres && i === 1 + sections.length;
        return (
          <div key={c.key} className="flex shrink-0 items-center gap-2">
            {firstGenre && sections.length > 0 && <span className="h-5 w-px bg-white/15" aria-hidden />}
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(c.key)}
              className={`relative flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition-colors ${
                active ? "text-white" : "border border-sky-400/30 bg-[#0b1d4d]/70 text-sky-100/80"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="drama-category-pill"
                  className="absolute inset-0 rounded-full border border-sky-200/70 bg-gradient-to-b from-[#4fb4ff] to-[#1546c9]"
                  style={{ boxShadow: "0 0 14px rgba(56,150,255,0.55), inset 0 1px 0 rgba(255,255,255,0.5)" }}
                  transition={{ type: "spring", stiffness: 450, damping: 34 }}
                />
              )}
              {Icon && <Icon className="relative h-3.5 w-3.5" />}
              <span className="relative">{c.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
