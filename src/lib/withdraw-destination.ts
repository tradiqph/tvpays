"use client";

/** Saved payout details on this device only (localStorage). */
export type SavedWithdrawDestination = {
  destinationType: "gcash" | "maya";
  destinationNumber: string;
  destinationName: string;
};

const KEY = "tvpays:withdraw-destination";

function isSaved(value: unknown): value is SavedWithdrawDestination {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedWithdrawDestination;
  return (
    (v.destinationType === "gcash" || v.destinationType === "maya") &&
    typeof v.destinationNumber === "string" &&
    typeof v.destinationName === "string"
  );
}

export function getSavedWithdrawDestination(): SavedWithdrawDestination | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSaved(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveWithdrawDestination(data: SavedWithdrawDestination): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // private mode / quota
  }
}

export function clearSavedWithdrawDestination(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
