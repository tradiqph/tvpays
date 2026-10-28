"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { DramaPlatform } from "@/lib/shortdrama";

export type SavedDramaEntry = {
  dramaId: string;
  platform: DramaPlatform;
  title: string;
  cover: string | null;
  episodeNumber: number;
  episodeId: string;
  savedAt: string;
};

const KEY = "tvpays:drama-saved-list";
const listeners = new Set<() => void>();

/** Stable empty snapshot for SSR and useSyncExternalStore server fallback. */
const EMPTY_SNAPSHOT: SavedDramaEntry[] = [];

let cachedRaw: string | null = null;
let cachedSnapshot: SavedDramaEntry[] = EMPTY_SNAPSHOT;

function entryKey(e: Pick<SavedDramaEntry, "platform" | "dramaId">): string {
  return `${e.platform}:${e.dramaId}`;
}

function isSavedEntry(value: unknown): value is SavedDramaEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedDramaEntry;
  return (
    typeof v.dramaId === "string" &&
    typeof v.platform === "string" &&
    typeof v.title === "string" &&
    typeof v.episodeNumber === "number" &&
    typeof v.episodeId === "string" &&
    typeof v.savedAt === "string"
  );
}

function parseRaw(raw: string): SavedDramaEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedEntry);
  } catch {
    return [];
  }
}

function sortEntries(list: SavedDramaEntry[]): SavedDramaEntry[] {
  return [...list].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

function readRaw(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function read(): SavedDramaEntry[] {
  return parseRaw(readRaw());
}

function rebuildSnapshotFromRaw(raw: string): SavedDramaEntry[] {
  cachedRaw = raw;
  const sorted = sortEntries(parseRaw(raw));
  cachedSnapshot = sorted.length === 0 ? EMPTY_SNAPSHOT : sorted;
  return cachedSnapshot;
}

function getSnapshot(): SavedDramaEntry[] {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  const raw = readRaw();
  if (raw === cachedRaw) return cachedSnapshot;
  return rebuildSnapshotFromRaw(raw);
}

function notify(): void {
  listeners.forEach((l) => l());
}

function write(list: SavedDramaEntry[]): void {
  if (typeof window === "undefined") return;
  let json: string;
  try {
    json = JSON.stringify(list);
    window.localStorage.setItem(KEY, json);
  } catch {
    return;
  }
  rebuildSnapshotFromRaw(json);
  notify();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cachedRaw = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSavedDramaList(): SavedDramaEntry[] {
  return getSnapshot();
}

export function isDramaSaved(
  platform: DramaPlatform,
  dramaId: string,
): boolean {
  const k = entryKey({ platform, dramaId });
  return getSnapshot().some((e) => entryKey(e) === k);
}

export function saveDramaToList(entry: Omit<SavedDramaEntry, "savedAt">): void {
  const k = entryKey(entry);
  const current = read();
  const existing = current.find((e) => entryKey(e) === k);
  if (
    existing &&
    existing.episodeId === entry.episodeId &&
    existing.episodeNumber === entry.episodeNumber &&
    existing.title === entry.title &&
    existing.cover === entry.cover
  ) {
    return;
  }
  const next = current.filter((e) => entryKey(e) !== k);
  next.unshift({
    ...entry,
    savedAt: new Date().toISOString(),
  });
  write(next);
}

export function removeDramaFromList(
  platform: DramaPlatform,
  dramaId: string,
): void {
  const k = entryKey({ platform, dramaId });
  write(read().filter((e) => entryKey(e) !== k));
}

export function toggleDramaSaved(
  entry: Omit<SavedDramaEntry, "savedAt">,
): boolean {
  if (isDramaSaved(entry.platform, entry.dramaId)) {
    removeDramaFromList(entry.platform, entry.dramaId);
    return false;
  }
  saveDramaToList(entry);
  return true;
}

export function useDramaSavedList() {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);
  const isSaved = useCallback(
    (platform: DramaPlatform, dramaId: string) =>
      list.some((e) => entryKey(e) === entryKey({ platform, dramaId })),
    [list],
  );
  return { list, isSaved, saveDramaToList, removeDramaFromList, toggleDramaSaved };
}
