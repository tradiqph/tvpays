// Server-side client for DramaSDK (https://dramasdk.com/docs).
// The Secure Token must never reach the browser — only import this from
// route handlers / server components.

export type DramaSummary = {
  id: string;
  title: string;
  cover: string | null;
  description: string | null;
  episodes: number | null;
};

export type DramaEpisode = {
  id: string;
  number: number;
  title: string;
  image: string | null;
  videoUrl: string | null;
  duration: number | null;
  isLocked: boolean;
  subtitles: { language: string; label: string; url: string }[];
};

export type DramaPage = {
  items: DramaSummary[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type DramaEpisodes = {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  episodes: DramaEpisode[];
};

/** DramaSDK provider id, e.g. "reelshort" (must also be enabled in Apps → Routing). */
export type DramaPlatform = string;

const KNOWN_LABELS: Record<string, string> = {
  anyreel: "AnyReel",
  reelshort: "ReelShort",
  netshort: "NetShort",
  netreel: "NetReel",
  chillshorts: "ChillShorts",
  flickreels: "FlickReels",
  goodshort: "GoodShort",
  dramabox: "DramaBox",
  dramabox_web: "DramaBox",
};

// Our provider key → DramaSDK's routing id, where they differ.
const UPSTREAM_IDS: Record<string, string> = {
  dramabox: "dramabox_web",
};

export function platformLabel(p: DramaPlatform) {
  return KNOWN_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
}

const DEFAULT_PROVIDERS = "anyreel,reelshort,netshort,flickreels,goodshort,chillshorts";

/** Providers enabled via DRAMASDK_PROVIDERS, in tab order. */
export function enabledPlatforms(): DramaPlatform[] {
  const list = (process.env.DRAMASDK_PROVIDERS || DEFAULT_PROVIDERS)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9_-]{1,40}$/.test(s));
  return Array.from(new Set(list));
}

/** Validates a requested provider against the enabled list. */
export function resolvePlatform(requested: string | null): DramaPlatform {
  const enabled = enabledPlatforms();
  const match = enabled.find((p) => p === requested);
  if (requested && !match) {
    throw new ShortDramaError(`Provider "${requested}" is not enabled`, 400);
  }
  return match ?? enabled[0];
}

export class ShortDramaError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const UNAVAILABLE =
  "Dramas are temporarily unavailable. Please try again in a little while.";

function config() {
  const token = process.env.DRAMASDK_SECURE_TOKEN;
  const packageId = process.env.DRAMASDK_PACKAGE_ID;
  if (!token || !packageId) {
    console.error(
      "[dramasdk] DRAMASDK_SECURE_TOKEN and DRAMASDK_PACKAGE_ID must be set",
    );
    throw new ShortDramaError(UNAVAILABLE, 503);
  }
  return {
    token,
    packageId,
    base: process.env.DRAMASDK_API_URL || "https://sdk.dramasdk.com",
    language: process.env.DRAMASDK_LANGUAGE || "en",
  };
}

// Every DramaSDK catalog endpoint answers with the same envelope:
// data.categories[].stories[], each story optionally carrying episodes[].
type RawEpisode = {
  episode_id?: string;
  episode_number?: number;
  title?: string;
  video_url?: string;
  duration?: string | number;
  thumbnail?: string;
  is_locked?: boolean;
};

type RawStory = {
  story_id?: string;
  title?: string;
  cover?: string;
  description?: string;
  total_episodes?: number;
  episodes?: RawEpisode[];
};

type RawResponse = {
  status?: string;
  data?: { categories?: { stories?: RawStory[] }[] };
  pagination?: { pageNo?: number; hasMore?: boolean };
  error?: string;
};

async function call(
  provider: DramaPlatform,
  path: string,
  query: Record<string, string | undefined>,
  cache: RequestInit & { next?: { revalidate: number } },
) {
  const { token, packageId, base, language } = config();
  const url = new URL(path, base);
  const upstream = UPSTREAM_IDS[provider] ?? provider;
  for (const [k, v] of Object.entries({
    lang: language,
    provider: upstream,
    ...query,
  })) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-App-Package-ID": packageId,
      "X-App-Secure-Token": token,
    },
    ...cache,
  });
  const json = (await res.json().catch(() => null)) as RawResponse | null;
  if (!res.ok || json?.status !== "success") {
    // Provider messages can leak internals; log the detail, show a generic message.
    console.error(
      `[dramasdk] ${provider} ${path} → HTTP ${res.status}: ${json?.error ?? "no JSON body"}`,
    );
    throw new ShortDramaError(UNAVAILABLE, 502);
  }
  return json;
}

function stories(r: RawResponse): RawStory[] {
  return (r.data?.categories ?? []).flatMap((c) => c.stories ?? []);
}

/** DramaSDK often returns `http://` CDN links; browsers block those on HTTPS pages. */
export function normalizePlaybackUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  if (url.startsWith("http://")) return `https://${url.slice(7)}`;
  return url;
}

function toSummary(s: RawStory): DramaSummary {
  return {
    id: String(s.story_id ?? ""),
    title: s.title ?? "Untitled",
    cover: s.cover || null,
    description: s.description || null,
    episodes: typeof s.total_episodes === "number" ? s.total_episodes : null,
  };
}

function toPage(r: RawResponse): DramaPage {
  const seen = new Set<string>();
  const items = stories(r)
    .map(toSummary)
    .filter((i) => i.id && !seen.has(i.id) && seen.add(i.id));
  const pageNo = r.pagination?.pageNo ?? 1;
  const hasMore = Boolean(r.pagination?.hasMore);
  return { items, hasMore, nextCursor: hasMore ? String(pageNo + 1) : null };
}

// Catalog lists change slowly; cache briefly to save quota.
const CATALOG_CACHE = { next: { revalidate: 300 } };

export async function dramaHome(
  provider: DramaPlatform,
  cursor?: string,
  pageSize = "21",
) {
  return toPage(
    await call(provider, "/api/home", { pageNo: cursor ?? "1", pageSize }, CATALOG_CACHE),
  );
}

export async function dramaSearch(
  provider: DramaPlatform,
  q: string,
  pageSize = "21",
) {
  return toPage(
    await call(provider, "/api/search", { keyword: q, pageNo: "1", pageSize }, CATALOG_CACHE),
  );
}

export async function dramaEpisodes(
  provider: DramaPlatform,
  id: string,
): Promise<DramaEpisodes> {
  // Stream URLs can expire, so always fetch chapters fresh.
  const r = await call(
    provider,
    `/api/chapters/${encodeURIComponent(id)}`,
    { episodePageSize: "500" },
    { cache: "no-store" },
  );
  const story = stories(r)[0] ?? {};
  const eps = [...(story.episodes ?? [])].sort(
    (a, b) => (a.episode_number ?? 0) - (b.episode_number ?? 0),
  );
  return {
    id: String(story.story_id ?? id),
    title: story.title ?? "",
    description: story.description || null,
    cover: story.cover || null,
    episodes: eps.map((e, i) => {
      const n = e.episode_number ?? i + 1;
      const dur = Number(e.duration);
      return {
        id: String(e.episode_id ?? n),
        number: n,
        title: e.title ?? `Episode ${n}`,
        image: e.thumbnail || null,
        // Some providers omit the link here; fetch it via dramaStream().
        videoUrl: normalizePlaybackUrl(e.video_url),
        duration: Number.isFinite(dur) ? dur : null,
        isLocked: Boolean(e.is_locked),
        subtitles: [],
      };
    }),
  };
}

/** Fresh playable URL for one episode (providers whose chapter lists omit links). */
export async function dramaStream(
  provider: DramaPlatform,
  id: string,
  episode: number,
): Promise<{ videoUrl: string | null; image: string | null }> {
  const r = await call(
    provider,
    "/api/stream",
    { bookId: id, episode: String(episode) },
    { cache: "no-store" },
  );
  const ep = stories(r)[0]?.episodes?.[0];
  return {
    videoUrl: normalizePlaybackUrl(ep?.video_url),
    image: ep?.thumbnail || null,
  };
}
