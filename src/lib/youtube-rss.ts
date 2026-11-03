import { createAdminClient } from "@/lib/supabase/admin";

const RSS_BASE = "https://www.youtube.com/feeds/videos.xml?channel_id=";

function trailerChannelIdFromEnv(): string | undefined {
  return (
    process.env.TRAILER_CHANNEL_ID?.trim() ||
    process.env.MOVIEGASM_CHANNEL_ID?.trim() ||
    undefined
  );
}

function trailerSyncHandleUrlFromEnv(): string | undefined {
  return (
    process.env.TRAILER_SYNC_HANDLE_URL?.trim() ||
    process.env.MOVIEGASM_SYNC_HANDLE_URL?.trim() ||
    undefined
  );
}
const DEFAULT_SYNC_MAX = 80;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type RssVideoItem = {
  youtubeId: string;
  title: string;
  publishedAt: string | null;
};

/** Stable pseudo-random metrics for UI (do not change between syncs). */
export function displayMetricsForYoutubeId(youtubeId: string): {
  displayViews: number;
  adsFundDisplay: number;
} {
  let h = 0;
  for (let i = 0; i < youtubeId.length; i++) {
    h = (h * 31 + youtubeId.charCodeAt(i)) >>> 0;
  }
  const viewsBase = 850_000 + (h % 2_350_000);
  const fund = 400 + ((h >>> 8) % 501);
  return {
    displayViews: viewsBase,
    adsFundDisplay: Math.round(fund * 100) / 100,
  };
}

export function formatViewCount(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(0)}K views`;
  }
  return `${n} views`;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`fetch_failed:${res.status}:${url}`);
  }
  return res.text();
}

function parseYtInitialData(html: string): unknown {
  const marker = "var ytInitialData = ";
  const idx = html.indexOf(marker);
  if (idx < 0) throw new Error("yt_initial_data_not_found");
  let i = idx + marker.length;
  while (i < html.length && html[i] !== "{") i++;
  if (html[i] !== "{") throw new Error("yt_initial_data_not_found");

  let depth = 0;
  const start = i;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(html.slice(start, i + 1)) as unknown;
      }
    }
  }
  throw new Error("yt_initial_data_truncated");
}

function isVideoId(s: string): boolean {
  return /^[\w-]{11}$/.test(s);
}

function titleFromRenderer(node: Record<string, unknown>): string {
  const title = node.title as
    | { simpleText?: string; runs?: { text?: string }[] }
    | undefined;
  if (title?.simpleText) return title.simpleText;
  if (title?.runs?.[0]?.text) return title.runs[0].text;
  return "Movie trailer";
}

function collectVideosFromYtTree(
  node: unknown,
  out: Map<string, RssVideoItem>,
): void {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) collectVideosFromYtTree(item, out);
    return;
  }

  const obj = node as Record<string, unknown>;

  const richContent = obj.richItemRenderer as
    | { content?: { videoRenderer?: Record<string, unknown> } }
    | undefined;
  const renderer =
    (obj.gridVideoRenderer as Record<string, unknown> | undefined) ??
    (obj.videoRenderer as Record<string, unknown> | undefined) ??
    richContent?.content?.videoRenderer;

  if (renderer && typeof renderer.videoId === "string") {
    const id = renderer.videoId;
    if (isVideoId(id) && !out.has(id)) {
      out.set(id, {
        youtubeId: id,
        title: titleFromRenderer(renderer),
        publishedAt: null,
      });
    }
  }

  if (typeof obj.videoId === "string" && isVideoId(obj.videoId)) {
    const id = obj.videoId;
    if (!out.has(id)) {
      out.set(id, {
        youtubeId: id,
        title: titleFromRenderer(obj),
        publishedAt: null,
      });
    }
  }

  for (const value of Object.values(obj)) {
    collectVideosFromYtTree(value, out);
  }
}

function findContinuationToken(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const t = findContinuationToken(item);
      if (t) return t;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;
  const cont = obj.continuationCommand as { token?: string } | undefined;
  if (cont?.token) return cont.token;

  const endpoint = obj.continuationEndpoint as
    | { continuationCommand?: { token?: string } }
    | undefined;
  if (endpoint?.continuationCommand?.token) {
    return endpoint.continuationCommand.token;
  }

  for (const value of Object.values(obj)) {
    const t = findContinuationToken(value);
    if (t) return t;
  }
  return null;
}

function extractInnertubeConfig(html: string): {
  apiKey: string;
  clientVersion: string;
} {
  const apiKey =
    html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] ??
    html.match(/INNERTUBE_API_KEY\\":\\"([^"\\]+)/)?.[1];
  const clientVersion =
    html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1] ??
    "2.20250101.00.00";
  if (!apiKey) throw new Error("innertube_api_key_not_found");
  return { apiKey, clientVersion };
}

async function fetchBrowseContinuation(
  token: string,
  config: { apiKey: string; clientVersion: string },
): Promise<unknown> {
  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_UA,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: config.clientVersion,
            hl: "en",
            gl: "US",
          },
        },
        continuation: token,
      }),
      next: { revalidate: 0 },
    },
  );
  if (!res.ok) {
    throw new Error(`browse_continuation_failed:${res.status}`);
  }
  return res.json() as Promise<unknown>;
}

/** Channel /videos tab — many more uploads than RSS (~15). */
export async function fetchMovieGasmBrowseItems(
  maxItems = DEFAULT_SYNC_MAX,
): Promise<RssVideoItem[]> {
  const channelId = await resolveMovieGasmChannelId();
  const videosUrl = `https://www.youtube.com/channel/${channelId}/videos`;
  const html = await fetchText(videosUrl);
  const config = extractInnertubeConfig(html);
  const initial = parseYtInitialData(html);

  const map = new Map<string, RssVideoItem>();
  collectVideosFromYtTree(initial, map);

  let token = findContinuationToken(initial);
  let pages = 0;
  while (token && map.size < maxItems && pages < 12) {
    pages++;
    const contJson = await fetchBrowseContinuation(token, config);
    collectVideosFromYtTree(contJson, map);
    token = findContinuationToken(contJson);
  }

  return [...map.values()].slice(0, maxItems);
}

export async function fetchAllMovieGasmItems(
  maxItems = DEFAULT_SYNC_MAX,
): Promise<RssVideoItem[]> {
  const max = Math.min(
    200,
    Math.max(
      15,
      Number(
        process.env.TRAILER_SYNC_MAX ??
          process.env.MOVIEGASM_SYNC_MAX ??
          maxItems,
      ) || maxItems,
    ),
  );

  const merged = new Map<string, RssVideoItem>();

  try {
    const browse = await fetchMovieGasmBrowseItems(max);
    for (const item of browse) merged.set(item.youtubeId, item);
  } catch (e) {
    console.warn("[youtube-rss] browse fetch failed, falling back to RSS", e);
  }

  try {
    const rss = await fetchMovieGasmRssItems();
    for (const item of rss) {
      if (!merged.has(item.youtubeId)) merged.set(item.youtubeId, item);
      else if (item.publishedAt) {
        const existing = merged.get(item.youtubeId)!;
        merged.set(item.youtubeId, {
          ...existing,
          publishedAt: item.publishedAt,
          title: existing.title || item.title,
        });
      }
    }
  } catch (e) {
    console.warn("[youtube-rss] RSS fetch failed", e);
  }

  if (merged.size === 0) {
    throw new Error("no_videos_from_channel");
  }

  return [...merged.values()];
}

/** Resolve YouTube channel id from env or configured handle URL. */
export async function resolveMovieGasmChannelId(): Promise<string> {
  const fromEnv = trailerChannelIdFromEnv();
  if (fromEnv) return fromEnv;

  const handleUrl = trailerSyncHandleUrlFromEnv();
  if (!handleUrl) {
    throw new Error("trailer_channel_not_configured");
  }

  const html = await fetchText(handleUrl);
  const channelId =
    html.match(/"channelId":"(UC[^"]+)"/)?.[1] ??
    html.match(/"browseId":"(UC[^"]+)"/)?.[1] ??
    html.match(/channel_id=(UC[^"&]+)/)?.[1];

  if (!channelId) {
    throw new Error("channel_id_not_found");
  }
  return channelId;
}

function parseRssItems(xml: string): RssVideoItem[] {
  const entries = xml.split("<entry>").slice(1);
  const items: RssVideoItem[] = [];

  for (const chunk of entries) {
    const videoId =
      chunk.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ??
      chunk.match(/<id>yt:video:([^<]+)<\/id>/)?.[1];
    if (!videoId) continue;

    const title =
      chunk.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ??
      "Movie trailer";
    const published =
      chunk.match(/<published>([^<]+)<\/published>/)?.[1] ?? null;

    items.push({
      youtubeId: videoId,
      title: decodeXmlEntities(title),
      publishedAt: published,
    });
  }

  return items;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function fetchMovieGasmRssItems(): Promise<RssVideoItem[]> {
  const channelId = await resolveMovieGasmChannelId();
  const xml = await fetchText(`${RSS_BASE}${encodeURIComponent(channelId)}`);
  return parseRssItems(xml);
}

/** Alternating public/members for catalog variety (matches legacy seed pattern). */
function visibilityForIndex(i: number): "public" | "members" {
  return i % 3 === 1 ? "members" : "public";
}

export async function syncMovieGasmVideosToDb(): Promise<{
  upserted: number;
  channelId: string;
  totalFetched: number;
}> {
  const channelId = await resolveMovieGasmChannelId();
  const items = await fetchAllMovieGasmItems();
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  let upserted = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const metrics = displayMetricsForYoutubeId(item.youtubeId);

    const { data: existing } = await admin
      .from("videos")
      .select("id, display_views, ads_fund_display, visibility")
      .eq("youtube_id", item.youtubeId)
      .maybeSingle();

    const row = {
      title: item.title,
      youtube_id: item.youtubeId,
      published_at: item.publishedAt,
      sort_order: items.length - i,
      duration_label: null as string | null,
      visibility: existing?.visibility ?? visibilityForIndex(i),
      display_views:
        existing?.display_views && existing.display_views > 0
          ? existing.display_views
          : metrics.displayViews,
      ads_fund_display:
        existing?.ads_fund_display != null &&
        Number(existing.ads_fund_display) >= 100
          ? Number(existing.ads_fund_display)
          : metrics.adsFundDisplay,
      synced_at: nowIso,
    };

    if (existing?.id) {
      const { error } = await admin
        .from("videos")
        .update({
          title: row.title,
          published_at: row.published_at,
          sort_order: row.sort_order,
          synced_at: row.synced_at,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("videos").insert(row);
      if (error) throw new Error(error.message);
    }
    upserted++;
  }

  return { upserted, channelId, totalFetched: items.length };
}
