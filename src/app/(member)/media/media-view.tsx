"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { TrailerAdPlayer } from "@/components/media/TrailerAdPlayer";
import { TrailerListRow } from "@/components/media/TrailerListRow";
import type { VideoListItem } from "@/app/api/videos/route";
import { planBySlug, type PlanSlug } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import type { LikeResult } from "@/lib/video-likes";
import type { LikeBurst } from "@/components/media/LikePointsBurst";

type VisibilityFilter = "all" | "members" | "public";
type SortOrder = "latest" | "oldest" | "popular";

const SORT_OPTIONS: { id: SortOrder; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "oldest", label: "Oldest" },
  { id: "popular", label: "Most viewed" },
];

const VISIBILITY_CHIPS: { id: VisibilityFilter; label: string }[] = [
  { id: "members", label: "Members only" },
  { id: "public", label: "Public" },
  { id: "all", label: "All" },
];

const PAGE_SIZE = 10;

export function MediaView() {
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [sort, setSort] = useState<SortOrder>("latest");
  const [sortOpen, setSortOpen] = useState(false);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adsToday, setAdsToday] = useState(0);
  const [adsLimit, setAdsLimit] = useState(2);
  const [regularToday, setRegularToday] = useState(0);
  const [regularLimit, setRegularLimit] = useState(2);
  const [forfeitedToday, setForfeitedToday] = useState(0);
  const [forfeitedLimit, setForfeitedLimit] = useState(0);
  const [forfeitedBalance, setForfeitedBalance] = useState(0);
  const [planName, setPlanName] = useState("Free Trial");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [likesRewardedToday, setLikesRewardedToday] = useState(0);
  const [likeCap, setLikeCap] = useState(2);
  const [likePending, setLikePending] = useState<Set<string>>(new Set());
  const [likeBurst, setLikeBurst] = useState<LikeBurst | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const sortLabel =
    SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "Latest";

  useEffect(() => {
    if (!sortOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!sortRef.current?.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [sortOpen]);

  const loadPlan = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("plan_slug, subscription_ends_at, trial_ends_at")
      .eq("id", user.id)
      .single();
    const slug = (data?.plan_slug ?? "trial") as PlanSlug;
    const plan = planBySlug(slug) ?? planBySlug("trial")!;
    const paidActive =
      slug !== "trial" &&
      data?.subscription_ends_at &&
      new Date(data.subscription_ends_at).getTime() > Date.now();
    const trialActive =
      slug === "trial" &&
      data?.trial_ends_at &&
      new Date(data.trial_ends_at).getTime() > Date.now();
    const effective = paidActive || trialActive ? plan : planBySlug("trial")!;
    setPlanName(effective.name);
    setRegularLimit(effective.adsPerDay);
  }, []);

  const fetchPage = useCallback(
    async (pageNum: number, mode: "replace" | "append") => {
      const params = new URLSearchParams({
        filter: visibility,
        sort,
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/videos?${params}`);
      const json = (await res.json()) as {
        error?: string;
        videos?: VideoListItem[];
        adsToday?: number;
        adsLimit?: number;
        regularToday?: number;
        regularLimit?: number;
        forfeitedToday?: number;
        forfeitedLimit?: number;
        forfeitedBalance?: number;
        likesRewardedToday?: number;
        likeCap?: number;
        total?: number;
        hasMore?: boolean;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not load trailers");
      }
      const list = json.videos ?? [];
      setTotal(json.total ?? list.length);
      setHasMore(json.hasMore ?? false);
      setAdsToday(json.adsToday ?? 0);
      setAdsLimit(json.adsLimit ?? json.regularLimit ?? 2);
      setRegularToday(json.regularToday ?? json.adsToday ?? 0);
      setRegularLimit(json.regularLimit ?? json.adsLimit ?? 2);
      setForfeitedToday(json.forfeitedToday ?? 0);
      setForfeitedLimit(json.forfeitedLimit ?? 0);
      setForfeitedBalance(json.forfeitedBalance ?? 0);
      setLikesRewardedToday(json.likesRewardedToday ?? 0);
      if (json.likeCap != null) setLikeCap(json.likeCap);
      setPage(pageNum);
      setVideos((prev) => {
        if (mode === "replace") return list;
        const seen = new Set(prev.map((v) => v.id));
        const merged = [...prev];
        for (const v of list) {
          if (!seen.has(v.id)) merged.push(v);
        }
        return merged;
      });
      if (mode === "replace") {
        setSelectedId((prev) => {
          if (prev && list.some((v) => v.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      }
    },
    [visibility, sort],
  );

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchPage(1, "replace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      await fetchPage(page + 1, "append");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, page]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const selected = useMemo(
    () => videos.find((v) => v.id === selectedId) ?? videos[0] ?? null,
    [videos, selectedId],
  );

  const toggleLike = useCallback(
    async (videoId: string) => {
      if (likePending.has(videoId)) return;
      const prevLiked = videos.find((v) => v.id === videoId)?.liked ?? false;
      setLikePending((s) => new Set(s).add(videoId));
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, liked: !prevLiked } : v)),
      );
      try {
        const res = await fetch("/api/videos/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ video_id: videoId }),
        });
        const json = (await res.json()) as Partial<LikeResult> & {
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? "Could not like trailer");
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId ? { ...v, liked: Boolean(json.liked) } : v,
          ),
        );
        if (json.likes_rewarded_today != null) {
          setLikesRewardedToday(json.likes_rewarded_today);
        }
        if (json.daily_cap != null) setLikeCap(json.daily_cap);
        if (json.awarded && json.awarded > 0) {
          const amount = json.awarded;
          const key = Date.now();
          setLikeBurst({ videoId, amount, key });
          setTimeout(() => {
            setLikeBurst((b) => (b?.key === key ? null : b));
          }, 1400);
        }
      } catch (e) {
        setVideos((prev) =>
          prev.map((v) => (v.id === videoId ? { ...v, liked: prevLiked } : v)),
        );
        setError(e instanceof Error ? e.message : "Network error");
      } finally {
        setLikePending((s) => {
          const next = new Set(s);
          next.delete(videoId);
          return next;
        });
      }
    },
    [likePending, videos],
  );

  const selectVideo = useCallback((id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader />
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-2 pt-1">
        <p className="mb-2 shrink-0 text-center text-xs text-sky-200/80">
          Watch Ads for 10 seconds to credit your points.
        </p>

        {notice && (
          <p className="mb-2 shrink-0 rounded-xl border border-sky-600/40 bg-sky-950/50 px-3 py-2 text-center text-xs text-sky-100">
            {notice}
          </p>
        )}

        {error && (
          <p className="mb-2 shrink-0 rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-center text-xs text-red-100">
            {error}
          </p>
        )}

        <div ref={heroRef} className="mb-3 shrink-0">
          {loading && !selected && (
            <div
              className="animate-pulse rounded-2xl border border-sky-800/40 bg-slate-900/60"
              style={{ aspectRatio: "16 / 9", minHeight: "11rem" }}
            />
          )}
          {selected && (
            <TrailerAdPlayer
              key={selected.id}
              video={selected}
              planName={planName}
              adsToday={adsToday}
              adsLimit={adsLimit}
              regularToday={regularToday}
              regularLimit={regularLimit}
              forfeitedToday={forfeitedToday}
              forfeitedLimit={forfeitedLimit}
              forfeitedBalance={forfeitedBalance}
              onCredited={(payload) => {
                setAdsToday(payload.adsToday);
                setAdsLimit(payload.adsLimit);
                if (payload.regularToday != null) {
                  setRegularToday(payload.regularToday);
                }
                if (payload.regularLimit != null) {
                  setRegularLimit(payload.regularLimit);
                }
                if (payload.forfeitedToday != null) {
                  setForfeitedToday(payload.forfeitedToday);
                }
                if (payload.forfeitedLimit != null) {
                  setForfeitedLimit(payload.forfeitedLimit);
                }
                if (payload.forfeitedBalance != null) {
                  setForfeitedBalance(payload.forfeitedBalance);
                }
                setVideos((prev) =>
                  prev.map((v) =>
                    v.id === selected.id ? { ...v, credited_today: true } : v,
                  ),
                );
              }}
              onNotice={setNotice}
              liked={selected.liked}
              likePending={likePending.has(selected.id)}
              likeBurst={likeBurst?.videoId === selected.id ? likeBurst : null}
              onToggleLike={() => void toggleLike(selected.id)}
              likesRewardedToday={likesRewardedToday}
              likeCap={likeCap}
            />
          )}
        </div>

        <div className="relative z-20 mb-2 flex shrink-0 items-center gap-2 overflow-x-auto pb-1">
          <div ref={sortRef} className="relative shrink-0">
            <button
              type="button"
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              onClick={() => setSortOpen((o) => !o)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sortOpen
                  ? "border-sky-400 bg-sky-600 text-white"
                  : "border-sky-700/60 bg-slate-900/60 text-sky-200 hover:border-sky-500/70"
              }`}
            >
              {sortLabel}
              <ChevronDown
                className={`h-3.5 w-3.5 opacity-80 transition ${sortOpen ? "rotate-180" : ""}`}
              />
            </button>
            {sortOpen && (
              <ul
                role="listbox"
                aria-label="Sort trailers"
                className="absolute left-0 top-full z-30 mt-1 min-w-[10.5rem] overflow-hidden rounded-xl border border-sky-700/60 bg-slate-950/95 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              >
                {SORT_OPTIONS.map((opt) => {
                  const active = sort === opt.id;
                  return (
                    <li key={opt.id} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => {
                          setSort(opt.id);
                          setSortOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs ${
                          active
                            ? "bg-sky-600/30 font-semibold text-white"
                            : "text-sky-100/90 hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                        {active && <Check className="h-3.5 w-3.5 text-sky-300" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {VISIBILITY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setVisibility(chip.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                visibility === chip.id
                  ? "bg-sky-600 text-white"
                  : "border border-slate-700 text-slate-300 hover:border-sky-700"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading && videos.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                Loading trailers…
              </p>
            )}

            {!loading && videos.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No trailers for this filter. Try All or another sort.
              </p>
            )}

            <div className="flex flex-col gap-2 pb-2">
              {videos.map((v) => (
                <TrailerListRow
                  key={v.id}
                  video={v}
                  selected={v.id === selected?.id}
                  onSelect={() => selectVideo(v.id)}
                  onToggleLike={() => void toggleLike(v.id)}
                  likePending={likePending.has(v.id)}
                  likeBurst={likeBurst?.videoId === v.id ? likeBurst : null}
                />
              ))}
            </div>

            {videos.length > 0 && (
              <div className="flex flex-col items-center gap-1.5 pb-3 pt-1">
                {hasMore ? (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                    className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-sky-900/40 px-4 py-1.5 text-xs font-semibold text-sky-100 transition hover:border-sky-400 hover:bg-sky-800/60 disabled:opacity-50"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                    {!loadingMore && <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                ) : (
                  <p className="text-[11px] text-slate-400">All trailers loaded</p>
                )}
                <p className="text-[10px] text-sky-200/50">
                  {videos.length} of {total} trailer{total === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
