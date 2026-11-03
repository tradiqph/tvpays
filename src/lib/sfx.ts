"use client";

import { getPreferences } from "@/lib/preferences";

const COINS_SRC = "/assets/coind%20drop.mp3";

let coins: HTMLAudioElement | null = null;

/** Coin drop, played when an episode reward lands. */
export function playCoinSound() {
  if (typeof window === "undefined" || !getPreferences().soundEffects) return;
  try {
    coins ??= new Audio(COINS_SRC);
    coins.volume = 0.7;
    coins.currentTime = 0;
    // Autoplay can be blocked; a missing sound shouldn't break the reward flow.
    void coins.play().catch(() => {});
  } catch {
    /* audio unavailable */
  }
}
