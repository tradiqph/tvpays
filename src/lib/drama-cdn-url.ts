/** HTTPS CDN URLs from drama providers (covers, HLS, segments). */
export function isAllowedDramaCdnUrl(raw: string | null): URL | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:") return null;
  if (
    !host.includes(".") ||
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^[\d.]+$/.test(host) ||
    host.includes(":")
  ) {
    return null;
  }
  return url;
}

export function requestPublicOrigin(request: Request): string {
  const u = new URL(request.url);
  const fwd = request.headers.get("x-forwarded-host");
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    u.protocol.replace(":", "");
  if (fwd) {
    return `${proto}://${fwd.split(",")[0].trim()}`;
  }
  return u.origin;
}
