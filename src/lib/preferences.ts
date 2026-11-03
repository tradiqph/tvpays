"use client";

import { useCallback, useSyncExternalStore } from "react";

// Per-device app preferences, kept in localStorage.
export type Preferences = {
  /** Jump to the next unlocked episode when one finishes. */
  autoplayNext: boolean;
  /** Start episodes with sound off. */
  startMuted: boolean;
  /** Cap HLS streams at ~480p to save mobile data. */
  dataSaver: boolean;
  /** Drama source to open first on Media (null = app default). */
  defaultSource: string | null;
  /** Play the coin sound when an episode earns a reward. */
  soundEffects: boolean;
  /** Turn off decorative animations regardless of the OS setting. */
  reduceMotion: boolean;
  /** In-app notification categories shown under the bell. */
  notifyReminders: boolean;
  notifyAccess: boolean;
  notifyWallet: boolean;
};

const KEY = "tvpays:prefs";
export const DEFAULT_PREFERENCES: Preferences = {
  autoplayNext: true,
  startMuted: false,
  dataSaver: false,
  defaultSource: null,
  soundEffects: true,
  reduceMotion: false,
  notifyReminders: true,
  notifyAccess: true,
  notifyWallet: true,
};
const DEFAULTS = DEFAULT_PREFERENCES;
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
  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      return;
    }
    listeners.forEach((l) => l());
  }, []);
  return [prefs, set, reset] as const;
}

export type NotificationCategory = "reminders" | "access" | "wallet";

/** Maps a notification id (see member-notifications.ts) to its settings category. */
export function notificationCategory(id: string): NotificationCategory | null {
  if (/^(checkin|episodes)-/.test(id)) return "reminders";
  if (/^(drama-access|subscription|trial)-/.test(id)) return "access";
  if (/^(withdrawal|refund)-/.test(id)) return "wallet";
  return null;
}

export function notificationAllowed(id: string, prefs: Preferences): boolean {
  switch (notificationCategory(id)) {
    case "reminders":
      return prefs.notifyReminders;
    case "access":
      return prefs.notifyAccess;
    case "wallet":
      return prefs.notifyWallet;
    default:
      return true;
  }
}
