/* eslint-disable @next/next/no-img-element */
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
          className="pointer-events-none absolute inset-0 bg-[#02040a]"
          aria-hidden
        />
        <img
          src="/assets/branding/auth-bg.jpg"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90"
          draggable={false}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#02040a]/55 via-[#02040a]/25 to-[#02040a]/85]"
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
