import type { ReactNode } from "react";

/** Outer glowing glass frame that groups a hero + stack of StatTiles + action. */
export function GlassPanel({
  children,
  glow = "rgba(56, 140, 255, 0.45)",
  className = "",
}: {
  children: ReactNode;
  glow?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-sky-400/60 bg-gradient-to-b from-[#0c2a6b]/80 via-[#071a45]/85 to-[#040d26]/90 p-3 ${className}`}
      style={{
        boxShadow: `0 0 28px ${glow}, inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 40px rgba(30,90,255,0.15)`,
      }}
    >
      {/* light rays behind the hero */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 25%, ${glow}, transparent 70%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
