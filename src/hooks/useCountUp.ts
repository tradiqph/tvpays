"use client";

import { useEffect, useState } from "react";

export function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(from + (target - from) * t);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
