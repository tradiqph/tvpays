/** DramaSDK often returns `http://` links; HTTPS pages require secure URLs. */
export function normalizePlaybackUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.startsWith("http://")) return `https://${url.slice(7)}`;
  return url;
}

/** Route HLS through our relay so hls.js avoids CDN CORS blocks on production. */
export function memberPlaybackSrc(url: string | null | undefined): string | null {
  const normalized = normalizePlaybackUrl(url);
  if (!normalized) return null;
  if (/\.m3u8(\?|$)/i.test(normalized)) {
    return `/api/dramas/relay?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}
