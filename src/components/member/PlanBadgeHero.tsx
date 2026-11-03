"use client";

import { motion } from "framer-motion";
import { PlanBadgeVisual } from "./PlanBadgeVisual";

type Props = {
  planSlug: string;
  tierNumber: number | null;
  planName: string;
};

export function PlanBadgeHero({ planSlug }: Props) {
  return (
    <motion.div
      key={planSlug}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative mx-auto mb-3 w-full max-w-[280px]"
    >
      <div className="relative flex flex-col items-center py-2">
        <PlanBadgeVisual planSlug={planSlug} variant="hero" />
      </div>
    </motion.div>
  );
}
