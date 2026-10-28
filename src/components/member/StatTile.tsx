import type { LucideIcon } from "lucide-react";

export type StatTileVariant = "blue" | "gold" | "purple";

const variants: Record<
  StatTileVariant,
  { tile: string; icon: string; label: string; value: string; shadow: string }
> = {
  blue: {
    tile: "border-sky-300/35 bg-gradient-to-r from-[#1d4ed8]/55 via-[#123a9c]/55 to-[#0b2266]/60",
    icon: "border-sky-300/50 bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a]",
    label: "text-sky-100/85",
    value: "text-white",
    shadow: "0 0 14px rgba(59,130,246,0.25)",
  },
  gold: {
    tile: "border-amber-200/70 bg-gradient-to-r from-[#f7b500] via-[#d98a00] to-[#9a5400]",
    icon: "border-amber-100/70 bg-gradient-to-br from-[#ffd34d] to-[#b86e00]",
    label: "text-amber-50/90",
    value: "bg-gradient-to-b from-[#fff7c2] to-[#ffd23f] bg-clip-text text-transparent",
    shadow: "0 0 20px rgba(251,191,36,0.45)",
  },
  purple: {
    tile: "border-violet-300/40 bg-gradient-to-r from-[#6d28d9]/70 via-[#4c1d95]/70 to-[#2e1065]/75",
    icon: "border-violet-200/50 bg-gradient-to-br from-[#a78bfa] to-[#5b21b6]",
    label: "text-violet-100/85",
    value: "text-white",
    shadow: "0 0 16px rgba(139,92,246,0.3)",
  },
};

type Props = {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  value: string;
  variant?: StatTileVariant;
};

/** Gradient row with an icon tile, small uppercase label and large value. */
export function StatTile({ icon: Icon, label, sublabel, value, variant = "blue" }: Props) {
  const v = variants[variant];
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 ${v.tile}`}
      style={{ boxShadow: `${v.shadow}, inset 0 1px 0 rgba(255,255,255,0.22)` }}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${v.icon}`}
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.35)" }}
      >
        <Icon className="h-6 w-6 text-white drop-shadow" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${v.label}`}>
          {label}
        </p>
        {sublabel && (
          <p className={`text-[10px] font-medium uppercase ${v.label}`}>{sublabel}</p>
        )}
        <p className={`text-2xl font-extrabold tracking-tight drop-shadow ${v.value}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
