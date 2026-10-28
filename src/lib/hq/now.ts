import { connection } from "next/server";
import { daysAgoIso, lastNDays, manilaDay, relative } from "@/lib/hq/format";

/** Request-scoped time helpers for HQ RSC (safe under Cache Components). */
export async function getHqTimeContext() {
  await connection();
  const now = Date.now();
  return {
    now,
    daysAgoIso: (n: number) => daysAgoIso(n, now),
    lastNDays: (n: number) => lastNDays(n, now),
    relative: (iso: string | null | undefined) => relative(iso, now),
    manilaToday: () => manilaDay(new Date(now)),
  };
}
