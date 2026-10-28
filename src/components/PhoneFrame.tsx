import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function PhoneFrame({ children, className = "" }: Props) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#02040a]">
      <div
        className={`relative flex h-[100dvh] w-[min(100vw,calc(100dvh*9/16))] flex-col overflow-hidden touch-manipulation ${className}`}
        style={{ aspectRatio: "9 / 16" }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#000814] via-[#001428] to-[#000814]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-1/4 -top-1/4 h-[70%] w-[90%] rotate-12 bg-gradient-to-bl from-sky-500/25 via-blue-600/10 to-transparent blur-3xl"
          style={{ animation: "ambientPulse 6s ease-in-out infinite" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,80,180,0.15)]"
          aria-hidden
        />
        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
