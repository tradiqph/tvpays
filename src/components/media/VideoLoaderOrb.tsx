"use client";

import { HalaskaOrb, type HalaskaOrbVariant } from "@/components/media/HalaskaOrb";

type Props = {
  variant?: HalaskaOrbVariant;
  size?: number;
  label?: string;
  /** Full-screen overlay (stream fetch) vs inline */
  overlay?: boolean;
  className?: string;
};

export function VideoLoaderOrb({
  variant = "orbit",
  size = 56,
  label,
  overlay = true,
  className = "",
}: Props) {
  const content = (
    <>
      <HalaskaOrb variant={variant} size={size} aria-label={label ?? "Loading video"} />
      {label ? (
        <p className="max-w-[200px] text-center text-xs font-medium text-sky-200/90">
          {label}
        </p>
      ) : null}
    </>
  );

  if (!overlay) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 ${className}`}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/50 ${className}`}
    >
      {content}
    </div>
  );
}
