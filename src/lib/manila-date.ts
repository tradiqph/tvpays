/** Calendar date in Asia/Manila (YYYY-MM-DD). */
export function manilaViewDate(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}
