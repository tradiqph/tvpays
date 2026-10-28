"use client";

import type { ReactNode } from "react";

/**
 * Agent activity orb (Halaska Studio via 21st.dev).
 * CSS-only loader — no WebGL; suited for video/stream loading overlays.
 */

export type HalaskaOrbVariant =
  | "pulse"
  | "orbit"
  | "sweep"
  | "globe"
  | "spark";

const ORB_STAGE = 24;
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

const ORB_LATTICE = (() => {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) cells.push({ x, y });
  return cells;
})();

const ORB_RING = Array.from({ length: 8 }, (_, i) => i);

type Props = {
  variant?: HalaskaOrbVariant;
  size?: number;
  /** CSS color for dots / spark */
  color?: string;
  className?: string;
  "aria-label"?: string;
};

export function HalaskaOrb({
  variant = "orbit",
  size = 40,
  color = "#7dd3fc",
  className,
  "aria-label": ariaLabel = "Loading",
}: Props) {
  let cells: ReactNode = null;

  if (variant === "pulse" || variant === "sweep") {
    cells = ORB_LATTICE.map(({ x, y }) => {
      const delay =
        variant === "pulse" ? Math.hypot(x - 1, y - 1) * 260 : x * 220;
      return (
        <span
          key={`${x}${y}`}
          style={{
            position: "absolute",
            left: x * 8 + 2,
            top: y * 8 + 2,
            width: 4,
            height: 4,
            borderRadius: 2,
            background: "currentColor",
            opacity: 0.25,
            transform: "scale(0.4)",
            animation: `halaska-orb-swell 1.6s ${EASE} ${Math.round(delay)}ms infinite`,
          }}
        />
      );
    });
  } else if (variant === "orbit") {
    cells = ORB_RING.map((i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <span
          key={i}
          style={{
            position: "absolute",
            width: 3.5,
            height: 3.5,
            borderRadius: 2,
            left: 12 + Math.cos(a) * 9 - 1.75,
            top: 12 + Math.sin(a) * 9 - 1.75,
            background: "currentColor",
            opacity: 0.2,
            transform: "scale(0.5)",
            animation: `halaska-orb-swell 1.4s ${EASE} ${-(i / 8) * 1.4}s infinite`,
          }}
        />
      );
    });
  } else if (variant === "globe") {
    cells = ORB_RING.map((i) => (
      <span
        key={i}
        style={{
          position: "absolute",
          left: 12 - 1.75,
          top: 12 - 1.75,
          width: 3.5,
          height: 3.5,
          borderRadius: 2,
          background: "currentColor",
          animation: `halaska-orb-globe 3.2s linear ${-(i / 8) * 3.2}s infinite`,
        }}
      />
    ));
  } else if (variant === "spark") {
    cells = (
      <>
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            lineHeight: 1,
            animation: `halaska-orb-spark 2.4s ${EASE} infinite`,
          }}
        >
          ✦
        </span>
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            lineHeight: 1,
            opacity: 0,
            animation: "halaska-star-burst 2.4s ease-out infinite",
          }}
        >
          ✦
        </span>
      </>
    );
  }

  return (
    <span
      data-halaska-orb-reduced=""
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        color,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: ORB_STAGE,
          height: ORB_STAGE,
          transform: `scale(${size / ORB_STAGE})`,
          transformOrigin: "top left",
        }}
      >
        {cells}
      </span>
    </span>
  );
}
