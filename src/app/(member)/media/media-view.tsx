"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clapperboard, Loader2, Lock, Search, X } from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { useImmersiveWatch } from "@/components/member/ImmersiveWatchContext";
import { DramaSeriesFeed } from "@/components/media/DramaSeriesFeed";
import { AlertDialog } from "@/components/member/AlertDialog";
import { ProviderDropdown } from "@/components/media/ProviderDropdown";
import type {
  DramaEpisodes,
  DramaPage,
  DramaPlatform,
  DramaSummary,
} from "@/lib/shortdrama";

type PlatformOption = { key: DramaPlatform; label: string };

type DramaAccessUi = {
  canWatch: boolean;
  watchMode: "trial" | "paid" | "none";
  dramaAccessActive: boolean;
  dramaAccessEndsAt: string | null;
  trialActive: boolean;
  defaultPlatform: string;
  finishesToday: number;
  finishLimitTrial: number;
  episodesCompletedForEarningsToday: number;
  episodesEarningLimit: number;
  needsRenewal: boolean;
  needsSubscription: boolean;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

/** Route provider images through our server so browser blockers don't drop them. */
function proxied(src: string | null | undefined) {
  return src ? `/api/dramas/cover?url=${encodeURIComponent(src)}` : null;
}

function Poster({ src, title }: { src: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1b2f6b] to-[#070f2b]">
        <Clapperboard className="h-6 w-6 text-sky-300/60" />
      </div>
    );
  }
  return (
    // Served via our own cover proxy, so next/image's host allowlist doesn't apply.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={proxied(src)!}
      alt={title}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function MediaView({ platforms }: { platforms: PlatformOption[] }) {
  const [access, setAccess] = useState<DramaAccessUi | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [episodeNotice, setEpisodeNotice] = useState<string | null>(null);
  const [providerHint, setProviderHint] = useState<string | null>(null);
  const [platform, setPlatform] = useState<DramaPlatform>(platforms[0].key);
  const [items, setItems] = useState<DramaSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const [series, setSeries] = useState<
    (DramaEpisodes & { platform: DramaPlatform }) | null
  >(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [episodeIdx, setEpisodeIdx] = useState(0);
  // Links fetched on demand for episodes whose list entry has none (null = failed).
  const [streamUrls, setStreamUrls] = useState<Record<string, string | null>>(
    {},
  );
  const [streamLoading, setStreamLoading] = useState(false);
  const { setImmersive } = useImmersiveWatch();

  useEffect(() => {
    setImmersive(!!series);
    return () => setImmersive(false);
  }, [series, setImmersive]);

  const loadPage = useCallback(
    async (opts: {
      platform: DramaPlatform;
      q?: string;
      cursor?: string | null;
      append?: boolean;
    }) => {
      setLoading(true);
      setError(null);
      if (!opts.append) {
        setItems([]);
        setHasMore(false);
      }
      const params = new URLSearchParams({ platform: opts.platform });
      if (opts.q) params.set("q", opts.q);
      if (opts.cursor) params.set("cursor", opts.cursor);
      try {
        const page = await getJson<DramaPage>(`/api/dramas?${params}`);
        setItems((prev) => (opts.append ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setHasMore(page.hasMore && !opts.q);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load dramas");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const trialLockedKeys =
    access?.watchMode === "trial" && access.defaultPlatform
      ? platforms
          .filter((p) => p.key !== access.defaultPlatform)
          .map((p) => p.key)
      : [];

  const refreshAccess = useCallback(async () => {
    try {
      const a = await getJson<DramaAccessUi>("/api/drama/access");
      setAccess(a);
      if (a.watchMode === "trial" && a.defaultPlatform) {
        setPlatform(a.defaultPlatform as DramaPlatform);
      }
      return a;
    } catch {
      return null;
    } finally {
      setAccessLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  // Initial feed; state is only set from the async callbacks.
  useEffect(() => {
    if (accessLoading || (access && !access.canWatch)) return;
    let cancelled = false;
    const plat =
      access?.watchMode === "trial" && access.defaultPlatform
        ? access.defaultPlatform
        : platforms[0].key;
    getJson<DramaPage>(`/api/dramas?platform=${plat}`)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load dramas");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [platforms, access, accessLoading]);

  function switchPlatform(next: DramaPlatform) {
    if (next === platform) return;
    if (
      access?.watchMode === "trial" &&
      access.defaultPlatform &&
      next !== access.defaultPlatform
    ) {
      return;
    }
    setPlatform(next);
    void loadPage({ platform: next, q: activeQuery || undefined });
  }

  function onLockedProvider(key: string) {
    if (key === access?.defaultPlatform) return;
    setProviderHint("Upgrade to Elite or higher to unlock this source.");
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setActiveQuery(q);
    void loadPage({ platform, q });
  }

  function clearSearch() {
    setQuery("");
    setActiveQuery("");
    void loadPage({ platform });
  }

  async function openSeries(d: DramaSummary) {
    setSeriesLoading(true);
    setSeries({
      platform,
      id: d.id,
      title: d.title,
      description: d.description,
      cover: d.cover,
      episodes: [],
    });
    setEpisodeIdx(0);
    setStreamUrls({});
    try {
      const s = await getJson<DramaEpisodes>(
        `/api/dramas/${encodeURIComponent(d.id)}/episodes?platform=${platform}`,
      );
      const loaded = {
        ...s,
        platform,
        title: s.title || d.title,
        description: s.description ?? d.description,
        cover: s.cover ?? d.cover,
      };
      setSeries(loaded);
      const firstOpen = s.episodes.findIndex((ep) => !ep.isLocked);
      void selectEpisode(loaded, Math.max(0, firstOpen), {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load episodes");
      setSeries(null);
    } finally {
      setSeriesLoading(false);
    }
  }

  async function selectEpisode(
    s: DramaEpisodes & { platform: DramaPlatform },
    i: number,
    known: Record<string, string | null> = streamUrls,
  ) {
    setEpisodeIdx(i);
    const ep = s.episodes[i];
    if (!ep || ep.isLocked || ep.id in known) return;
    setStreamLoading(true);
    try {
      const r = await getJson<{ videoUrl: string | null }>(
        `/api/dramas/${encodeURIComponent(s.id)}/stream?platform=${s.platform}&episode=${ep.number}`,
      );
      setStreamUrls((m) => ({ ...m, [ep.id]: r.videoUrl }));
    } catch {
      setStreamUrls((m) => ({ ...m, [ep.id]: null }));
    } finally {
      setStreamLoading(false);
    }
  }

  async function reportEpisodeComplete(watchSeconds: number) {
    const ep = series?.episodes[episodeIdx];
    if (!series || !ep) return;
    setEpisodeNotice(null);
    try {
      const res = await fetch("/api/economy/drama-episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: series.platform,
          drama_id: series.id,
          episode_number: ep.number,
          watch_seconds: watchSeconds,
          duration_seconds: ep.duration,
          finished: true,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        rewarded?: boolean;
        amount?: number;
        episodesToday?: number;
        episodesLimit?: number;
      };
      if (!res.ok) {
        setEpisodeNotice(json.error ?? "Could not record episode.");
        return;
      }
      if (json.rewarded && json.amount != null) {
        setEpisodeNotice(`Earned ₱${json.amount.toFixed(2)} for this episode.`);
      } else {
        setEpisodeNotice(
          `Episode finished (${json.episodesToday ?? "?"}/${json.episodesLimit ?? "?"} earning slots today).`,
        );
      }
      await refreshAccess();
    } catch {
      setEpisodeNotice("Could not record episode completion.");
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {!series && <MemberHeader />}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="relative z-20 mb-3 flex items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-white">
            Drama Shorts
          </h1>
          {platforms.length > 1 && (
            <ProviderDropdown
              options={platforms}
              value={platform}
              onChange={switchPlatform}
              lockedKeys={trialLockedKeys}
              onLockedSelect={onLockedProvider}
            />
          )}
        </div>

        {providerHint && (
          <p className="mb-2 text-center text-xs text-amber-200">{providerHint}</p>
        )}

        {access && (
          <div className="mb-3 rounded-xl border border-sky-400/35 bg-[#0b1d4d]/70 px-3 py-2 text-xs text-sky-100">
            {access.watchMode === "trial" && access.trialActive && (
              <p>
                Free trial ·{" "}
                <span className="font-semibold text-white">
                  {access.finishesToday}/{access.finishLimitTrial}
                </span>{" "}
                episodes finished today
              </p>
            )}
            {access.watchMode === "paid" && access.dramaAccessEndsAt && (
              <p>
                Drama access until{" "}
                {new Date(access.dramaAccessEndsAt).toLocaleDateString("en-PH", {
                  timeZone: "Asia/Manila",
                })}
              </p>
            )}
            {!access.canWatch && access.needsRenewal && (
              <p className="text-amber-200">
                Drama access expired.{" "}
                <Link href="/renew" className="underline">
                  Renew streaming
                </Link>
              </p>
            )}
            {!access.canWatch && access.needsSubscription && (
              <p className="text-amber-200">
                Subscribe to Elite or higher to watch dramas.{" "}
                <Link href="/subscriptions" className="underline">
                  View plans
                </Link>
              </p>
            )}
          </div>
        )}

        {!accessLoading && access && !access.canWatch && (
          <div className="rounded-2xl border border-amber-400/40 bg-[#1a1208]/80 px-4 py-8 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-amber-300" />
            <p className="text-sm text-slate-200">
              {access.needsRenewal
                ? "Your included drama access has ended."
                : "Start a paid plan to unlock dramas."}
            </p>
            <Link
              href={access.needsRenewal ? "/renew" : "/subscriptions"}
              className="mt-4 inline-block rounded-full bg-sky-600 px-5 py-2 text-sm font-bold text-white"
            >
              {access.needsRenewal ? "Renew drama access" : "View subscriptions"}
            </Link>
          </div>
        )}

        {!accessLoading && access?.canWatch && (
        <>
        <form onSubmit={onSearch} className="mb-4">
          <label
            className="flex items-center gap-2 rounded-2xl border border-sky-400/45 bg-gradient-to-b from-[#123480]/70 to-[#071a4a]/85 px-3 py-2.5"
            style={{
              boxShadow:
                "0 0 14px rgba(40,120,255,0.2), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <Search className="h-4 w-4 text-sky-200" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dramas"
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-sky-100/50 focus:outline-none"
            />
            {(query || activeQuery) && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        </form>

        <div className="grid grid-cols-3 gap-2.5">
          {items.map((d, i) => (
            <motion.button
              key={`${d.id}-${i}`}
              type="button"
              onClick={() => openSeries(d)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.03 }}
              className="text-left"
            >
              <div
                className="relative aspect-[2/3] overflow-hidden rounded-xl border border-sky-300/30 bg-slate-900"
                style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.45)" }}
              >
                <Poster src={d.cover} title={d.title} />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent" />
                {d.episodes != null && (
                  <span className="absolute bottom-1 right-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    {d.episodes} EP
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-white">
                {d.title}
              </p>
            </motion.button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-sky-300" />
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            {activeQuery ? "No dramas match your search." : "No dramas yet."}
          </p>
        )}
        {!loading && hasMore && (
          <button
            type="button"
            onClick={() => loadPage({ platform, cursor, append: true })}
            className="mx-auto mt-4 block rounded-full border border-sky-300/60 bg-gradient-to-b from-[#3fa9ff] to-[#1340c9] px-6 py-2 text-sm font-bold text-white shadow-[0_0_14px_rgba(56,160,255,0.5)]"
          >
            Load more
          </button>
        )}
        </>
        )}
      </div>

      <AlertDialog
        open={error != null}
        onClose={() => setError(null)}
        title="Couldn't load dramas"
        message={error}
        action={{
          label: "Try again",
          onClick: () => {
            setError(null);
            void loadPage({ platform, q: activeQuery || undefined });
          },
        }}
        secondary={{ label: "Close", onClick: () => setError(null) }}
      />

      <AnimatePresence>
        {series && (
          <DramaSeriesFeed
            series={series}
            seriesLoading={seriesLoading}
            episodeIdx={episodeIdx}
            streamUrls={streamUrls}
            streamLoading={streamLoading}
            episodeNotice={episodeNotice}
            proxiedPoster={proxied}
            onClose={() => setSeries(null)}
            onSelectEpisode={(s, i) => void selectEpisode(s, i)}
            onEpisodeComplete={(sec) => void reportEpisodeComplete(sec)}
            onRetryStream={() => {
              const ep = series.episodes[episodeIdx];
              if (!ep) return;
              setStreamUrls((m) => {
                const next = { ...m };
                delete next[ep.id];
                return next;
              });
              void selectEpisode(series, episodeIdx, {});
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
