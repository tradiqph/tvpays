"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clapperboard, Lock, Search, X } from "lucide-react";
import { VideoLoaderOrb } from "@/components/media/VideoLoaderOrb";
import { MemberHeader } from "@/components/member/MemberHeader";
import { useImmersiveWatch } from "@/components/member/ImmersiveWatchContext";
import { DramaSeriesFeed } from "@/components/media/DramaSeriesFeed";
import { AlertDialog } from "@/components/member/AlertDialog";
import { ProviderDropdown } from "@/components/media/ProviderDropdown";
import { playCoinSound } from "@/lib/sfx";
import { CategoryChips, DRAMA_GENRES, type CategoryKey } from "@/components/media/CategoryChips";
import type {
  DramaEpisodes,
  DramaPage,
  DramaPlatform,
  DramaSummary,
  DramaSection,
} from "@/lib/shortdrama";
import { getPreferences } from "@/lib/preferences";
import { formatPhp } from "@/lib/format";

type PlatformOption = { key: DramaPlatform; label: string; search?: boolean };

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
  const searchParams = useSearchParams();
  /** Last successfully opened deep-link from My list (`platform:drama:ep`). */
  const loadedResumeKeyRef = useRef<string | null>(null);
  const resumeLoadGenRef = useRef(0);
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
  const [category, setCategory] = useState<CategoryKey>("home");
  const [sections, setSections] = useState<DramaSection[]>([]);

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
  const episodeNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const { setImmersive } = useImmersiveWatch();

  const flashEpisodeNotice = useCallback((message: string, ms = 3000) => {
    if (episodeNoticeTimerRef.current) {
      clearTimeout(episodeNoticeTimerRef.current);
    }
    setEpisodeNotice(message);
    episodeNoticeTimerRef.current = setTimeout(() => {
      setEpisodeNotice(null);
      episodeNoticeTimerRef.current = null;
    }, ms);
  }, []);

  useEffect(() => {
    setImmersive(!!series);
    return () => setImmersive(false);
  }, [series, setImmersive]);

  useEffect(() => {
    return () => {
      if (episodeNoticeTimerRef.current) {
        clearTimeout(episodeNoticeTimerRef.current);
      }
    };
  }, []);

  const loadPage = useCallback(
    async (opts: {
      platform: DramaPlatform;
      q?: string;
      section?: string;
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
      if (opts.section) params.set("section", opts.section);
      if (opts.cursor) params.set("cursor", opts.cursor);
      try {
        const page = await getJson<DramaPage>(`/api/dramas?${params}`);
        // Sections come from the plain home feed; keep them while browsing one.
        if (!opts.q && !opts.section && !opts.append) setSections(page.sections);
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
    const preferred = getPreferences().defaultSource;
    const plat =
      access?.watchMode === "trial" && access.defaultPlatform
        ? access.defaultPlatform
        : platforms.find((p) => p.key === preferred)?.key ?? platforms[0].key;
    getJson<DramaPage>(`/api/dramas?platform=${plat}`)
      .then((page) => {
        if (cancelled) return;
        setPlatform(plat);
        setSections(page.sections);
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
    setCategory("home");
    setSections([]);
    setQuery("");
    setActiveQuery("");
    void loadPage({ platform: next });
  }

  const supportsSearch = platforms.find((p) => p.key === platform)?.search !== false;

  function loadCategory(key: CategoryKey) {
    if (key.startsWith("s:")) return loadPage({ platform, section: key.slice(2) });
    if (key.startsWith("g:")) return loadPage({ platform, q: key.slice(2) });
    return loadPage({ platform });
  }

  function selectCategory(key: CategoryKey) {
    if (key === category) return;
    setCategory(key);
    setQuery("");
    setActiveQuery("");
    void loadCategory(key);
  }

  function onLockedProvider(key: string) {
    if (key === access?.defaultPlatform) return;
    setProviderHint("Upgrade to Elite or higher to unlock this source.");
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setActiveQuery(q);
    setCategory(q ? "search" : "home");
    void loadPage({ platform, q });
  }

  function clearSearch() {
    setQuery("");
    setActiveQuery("");
    setCategory("home");
    void loadPage({ platform });
  }

  async function fetchAndOpenSeries(
    plat: DramaPlatform,
    dramaId: string,
    opts?: {
      episodeNumber?: number;
      fallback?: Pick<DramaSummary, "title" | "description" | "cover">;
      isStale?: () => boolean;
    },
  ): Promise<boolean> {
    if (opts?.isStale?.()) return false;
    setSeriesLoading(true);
    setSeries({
      platform: plat,
      id: dramaId,
      title: opts?.fallback?.title ?? "",
      description: opts?.fallback?.description ?? null,
      cover: opts?.fallback?.cover ?? null,
      episodes: [],
    });
    setEpisodeIdx(0);
    setStreamUrls({});
    try {
      const s = await getJson<DramaEpisodes>(
        `/api/dramas/${encodeURIComponent(dramaId)}/episodes?platform=${plat}`,
      );
      if (opts?.isStale?.()) return false;
      if (s.episodes.length === 0) {
        throw new Error(
          "No episodes found for this show. Try opening it from the catalog again.",
        );
      }
      const loaded = {
        ...s,
        platform: plat,
        title: s.title || opts?.fallback?.title || "Untitled",
        description: s.description ?? opts?.fallback?.description ?? null,
        cover: s.cover ?? opts?.fallback?.cover ?? null,
      };
      setSeries(loaded);
      let idx = Math.max(0, s.episodes.findIndex((ep) => !ep.isLocked));
      if (opts?.episodeNumber != null && Number.isFinite(opts.episodeNumber)) {
        const byNum = loaded.episodes.findIndex(
          (ep) => ep.number === opts.episodeNumber,
        );
        if (byNum >= 0) idx = byNum;
      }
      if (opts?.isStale?.()) return false;
      await selectEpisode(loaded, idx, {});
      return true;
    } catch (e) {
      if (opts?.isStale?.()) return false;
      setError(e instanceof Error ? e.message : "Could not load episodes");
      setSeries(null);
      return false;
    } finally {
      setSeriesLoading(false);
    }
  }

  async function openSeries(d: DramaSummary) {
    await fetchAndOpenSeries(platform, d.id, {
      fallback: {
        title: d.title,
        description: d.description,
        cover: d.cover,
      },
    });
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

  useEffect(() => {
    if (accessLoading) return;
    if (access && !access.canWatch) return;

    const dramaId = searchParams.get("drama")?.trim();
    const epParam = searchParams.get("ep");
    let plat = searchParams.get("platform")?.trim().toLowerCase() as
      | DramaPlatform
      | undefined;
    if (!dramaId || !plat) {
      loadedResumeKeyRef.current = null;
      return;
    }
    if (!platforms.some((p) => p.key === plat)) return;

    if (access?.watchMode === "trial" && access.defaultPlatform) {
      plat = access.defaultPlatform as DramaPlatform;
    }

    const key = `${plat}:${dramaId}:${epParam ?? ""}`;
    if (loadedResumeKeyRef.current === key) return;

    const gen = ++resumeLoadGenRef.current;
    setPlatform(plat);
    setError(null);

    const stale = () => gen !== resumeLoadGenRef.current;
    const titleParam = searchParams.get("title");
    const coverParam = searchParams.get("cover");

    void (async () => {
      const epNum = epParam ? Number(epParam) : undefined;
      const ok = await fetchAndOpenSeries(plat!, dramaId, {
        episodeNumber: epNum,
        isStale: stale,
        fallback: titleParam
          ? {
              title: titleParam,
              description: null,
              cover: coverParam,
            }
          : undefined,
      });
      if (stale()) return;
      if (ok) loadedResumeKeyRef.current = key;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume when list deep-link or access becomes ready
  }, [searchParams, accessLoading, access, platforms]);

  async function reportEpisodeComplete(
    watchSeconds: number,
    fileDurationSeconds: number | null,
    peakSeconds: number,
  ) {
    const ep = series?.episodes[episodeIdx];
    if (!series || !ep) return;
    if (episodeNoticeTimerRef.current) {
      clearTimeout(episodeNoticeTimerRef.current);
      episodeNoticeTimerRef.current = null;
    }
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
          actual_file_seconds: fileDurationSeconds,
          peak_seconds: peakSeconds,
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
        flashEpisodeNotice(json.error ?? "Could not record episode.", 4000);
        return;
      }
      if (json.rewarded && json.amount != null) {
        flashEpisodeNotice(`Earned ${formatPhp(json.amount)}`, 3000);
        playCoinSound();
      } else {
        flashEpisodeNotice(
          `Episode finished (${json.episodesToday ?? "?"}/${json.episodesLimit ?? "?"} earning slots today).`,
          3000,
        );
      }
      await refreshAccess();
    } catch {
      flashEpisodeNotice("Could not record episode completion.", 4000);
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

        {access &&
          ((access.watchMode === "trial" && access.trialActive) ||
            (!access.canWatch && access.needsRenewal) ||
            (!access.canWatch && access.needsSubscription)) && (
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
              disabled={!supportsSearch}
              maxLength={80}
              placeholder={
                supportsSearch
                  ? "Search dramas"
                  : `Search isn't available on ${platforms.find((p) => p.key === platform)?.label ?? "this source"}`
              }
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

        <CategoryChips
          value={category}
          sections={sections}
          showGenres={supportsSearch}
          onChange={selectCategory}
        />

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
          <VideoLoaderOrb
            overlay={false}
            size={44}
            label="Loading dramas…"
            className="py-6"
          />
        )}
        {!loading && !error && items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            {activeQuery
              ? "No dramas match your search."
              : category.startsWith("g:")
                ? `No ${DRAMA_GENRES.find((g) => `g:${g.q}` === category)?.label ?? ""} dramas on this source yet.`
                : "No dramas yet."}
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
            void (activeQuery ? loadPage({ platform, q: activeQuery }) : loadCategory(category));
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
            onEpisodeComplete={(sec, fileDur, peak) =>
              void reportEpisodeComplete(sec, fileDur, peak)
            }
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
