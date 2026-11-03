import { safePostgrestSearch } from "@/lib/security/input";

const TZ = "Asia/Manila";

export function php(n: number | string | null | undefined): string {
  return `₱${Number(n ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact peso for stat cards: ₱1.2M, ₱45.3K. */
export function phpCompact(n: number): string {
  return `₱${new Intl.NumberFormat("en-PH", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relative(
  iso: string | null | undefined,
  nowMs?: number,
): string {
  if (!iso) return "—";
  const now = nowMs ?? Date.now();
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return dateTime(iso);
}

/** YYYY-MM-DD in Manila time, for bucketing chart data by day. */
export function manilaDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
}

export function lastNDays(
  n: number,
  nowMs?: number,
): { key: string; label: string }[] {
  const now = nowMs ?? Date.now();
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    out.push({
      key: manilaDay(d),
      label: d.toLocaleDateString("en-PH", { timeZone: TZ, month: "short", day: "numeric" }),
    });
  }
  return out;
}

export function daysAgoIso(n: number, nowMs?: number): string {
  const now = nowMs ?? Date.now();
  return new Date(now - n * 86_400_000).toISOString();
}

/** Strip characters that would break out of a PostgREST or() filter. */
export function safeSearch(q: string | undefined): string {
  return safePostgrestSearch(q, 60);
}

export function humanize(s: string): string {
  return s.replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
