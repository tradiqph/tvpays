"use client";

import { useCallback, useSyncExternalStore } from "react";

// Per-device app preferences, kept in localStorage.
export type Preferences = {
  /** Jump to the next unlocked episode when one finishes. */
  autoplayNext: boolean;
  /** Turn off decorative animations regardless of the OS setting. */
  reduceMotion: boolean;
};

const KEY = "tvpays:prefs";
const DEFAULTS: Preferences = { autoplayNext: true, reduceMotion: false };
const listeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cached: Preferences = DEFAULTS;

function read(): Preferences {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Storage blocked (private mode etc.): fall back to defaults.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = { ...DEFAULTS, ...(raw ? (JSON.parse(raw) as Partial<Preferences>) : {}) };
    } catch {
      cached = DEFAULTS;
    }
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function getPreferences(): Preferences {
  return typeof window === "undefined" ? DEFAULTS : read();
}

export function usePreferences() {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  const set = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const next = { ...read(), [key]: value };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      return;
    }
    listeners.forEach((l) => l());
  }, []);
  return [prefs, set] as const;
}
