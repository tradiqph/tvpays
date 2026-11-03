"use client";

import { AnimatePresence, motion } from "framer-motion";

export type LikeBurst = { videoId: string; amount: number; key: number };

/** Small "+5 Ads Points" that floats up and fades out above a like button. */
export function LikePointsBurst({ burst }: { burst: LikeBurst | null }) {
  return (
    <AnimatePresence>
      {burst && (
        <motion.span
          key={burst.key}
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={{ opacity: [0, 1, 1, 0], y: -22, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.3, ease: "easeOut", times: [0, 0.15, 0.7, 1] }}
          className="pointer-events-none absolute bottom-full left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(245,158,11,0.6)]"
          aria-live="polite"
        >
          +{burst.amount} Ads Points
        </motion.span>
      )}
    </AnimatePresence>
  );
}
