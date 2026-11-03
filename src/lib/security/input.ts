/** Strip characters that break PostgREST `.or()` / `ilike` filter strings. */
export function safePostgrestSearch(q: string | undefined, maxLen = 60): string {
  return (q ?? "")
    .replace(/[,()%*\\:"'.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function escapePostgrestLike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}

export function clampText(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Drama / provider content ids from DramaSDK (often short numeric story_id values). */
export function isSafeDramaId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

export function isSafePlatform(platform: string, allowed: readonly string[]): boolean {
  const p = platform.trim().toLowerCase();
  return allowed.some((a) => a.toLowerCase() === p);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailInput(raw: unknown): string | null {
  const email = clampText(raw, 254).toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return null;
  return email;
}

export function isAllowedPlanSlug(
  slug: string,
  allowed: readonly string[],
): boolean {
  return allowed.includes(slug);
}

export function isAllowedAgentStatus(status: string): boolean {
  return ["none", "pending", "approved", "rejected"].includes(status);
}
