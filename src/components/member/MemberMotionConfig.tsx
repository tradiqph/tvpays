"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { usePreferences } from "@/lib/preferences";

export function MemberMotionConfig({ children }: { children: ReactNode }) {
  const [prefs] = usePreferences();
  return (
    <MotionConfig
      reducedMotion={prefs.reduceMotion ? "always" : "user"}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {children}
    </MotionConfig>
  );
}
