import { ArrowRight, Coins, Play, ShoppingCart, Wallet } from "lucide-react";
import type { ReactNode } from "react";

/** Glossy dark-glass tile with a coloured inner glow and top shine. */
function GlossTile({ glow, children }: { glow: string; children: ReactNode }) {
  return (
    <div
      className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-b from-white/15 to-black/40"
      style={{
        boxShadow: `inset 0 0 18px ${glow}, inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 14px rgba(0,0,0,0.45)`,
      }}
    >
      <div className="pointer-events-none absolute inset-x-1 top-0.5 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/30 to-transparent" />
      {children}
    </div>
  );
}

/** Small glossy round badge layered over the main icon. */
function Badge({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`absolute flex items-center justify-center rounded-full border border-white/60 ${className}`}
      style={{
        boxShadow:
          "inset 0 2px 3px rgba(255,255,255,0.6), inset 0 -3px 5px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </span>
  );
}

const iconGlow = (c: string) => ({ filter: `drop-shadow(0 0 6px ${c})` });

export function DepositIconArt() {
  return (
    <GlossTile glow="rgba(56,140,255,0.75)">
      <Wallet
        className="relative h-10 w-10 fill-blue-500/60 text-sky-200"
        strokeWidth={1.6}
        style={iconGlow("rgba(56,160,255,0.9)")}
      />
      <Badge className="right-2 top-2 h-7 w-7 bg-[radial-gradient(circle_at_35%_30%,#fff3b0,#f6b300_55%,#a86400)] text-[13px] font-black text-amber-900">
        ₱
      </Badge>
    </GlossTile>
  );
}

export function SpendingIconArt() {
  return (
    <GlossTile glow="rgba(192,80,255,0.75)">
      <ShoppingCart
        className="relative h-11 w-11 fill-purple-500/40 text-fuchsia-200"
        strokeWidth={1.6}
        style={iconGlow("rgba(217,70,239,0.9)")}
      />
      <Badge className="left-[30px] top-[22px] h-5 w-5 bg-gradient-to-b from-fuchsia-400 to-purple-700">
        <Play className="ml-px h-2.5 w-2.5 fill-white text-white" />
      </Badge>
    </GlossTile>
  );
}

export function WithdrawIconArt() {
  return (
    <GlossTile glow="rgba(34,197,94,0.75)">
      <Coins
        className="relative h-10 w-10 fill-amber-400/70 text-amber-200"
        strokeWidth={1.6}
        style={iconGlow("rgba(251,191,36,0.9)")}
      />
      <Badge className="bottom-2 right-2 h-7 w-7 bg-gradient-to-b from-emerald-400 to-green-700">
        <ArrowRight className="h-4 w-4 text-white" strokeWidth={3} />
      </Badge>
    </GlossTile>
  );
}
