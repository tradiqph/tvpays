"use client";

import { useCallback, useEffect, useState } from "react";
import { playCoinSound } from "@/lib/sfx";

export const REWARD_EARNED_DISPLAY_MS = 3000;

export function useRewardEarnedFlash() {
  const [earnedAmount, setEarnedAmount] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  const celebrateEarned = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    playCoinSound();
    setFlashKey((k) => k + 1);
    setEarnedAmount(amount);
  }, []);

  useEffect(() => {
    if (earnedAmount == null) return;
    const t = window.setTimeout(
      () => setEarnedAmount(null),
      REWARD_EARNED_DISPLAY_MS,
    );
    return () => window.clearTimeout(t);
  }, [earnedAmount, flashKey]);

  return { earnedAmount, flashKey, celebrateEarned };
}
