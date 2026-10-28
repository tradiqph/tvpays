"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AnimatedView } from "./AnimatedView";

export function TabTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <AnimatedView key={pathname}>{children}</AnimatedView>
    </AnimatePresence>
  );
}
