/** Calendar date in Asia/Manila (YYYY-MM-DD). */
export function manilaViewDate(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

/** UTC ISO bounds for filtering `requested_at` within one Manila calendar day. */
export function manilaDayRequestBounds(now = new Date()): {
  startIso: string;
  endExclusiveIso: string;
} {
  const day = manilaViewDate(now);
  const startMs = new Date(`${day}T00:00:00+08:00`).getTime();
  const endMs = startMs + 86_400_000;
  return {
    startIso: new Date(startMs).toISOString(),
    endExclusiveIso: new Date(endMs).toISOString(),
  };
}
