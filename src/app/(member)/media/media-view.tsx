"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { TrailerAdPlayer } from "@/components/media/TrailerAdPlayer";
import { TrailerListRow } from "@/components/media/TrailerListRow";
import type { VideoListItem } from "@/app/api/videos/route";
import { planBySlug, type PlanSlug } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";

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
  const [planName, setPlanName] = useState("Free Trial");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    setAdsLimit(effective.adsPerDay);
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

  const selectVideo = useCallback((id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader />
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-24 pt-1">
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
              onCredited={({ adsToday: t, adsLimit: l }) => {
                setAdsToday(t);
                setAdsLimit(l);
                setVideos((prev) =>
                  prev.map((v) =>
                    v.id === selected.id ? { ...v, credited_today: true } : v,
                  ),
                );
              }}
              onNotice={setNotice}
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

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
              />
            ))}
          </div>

          {videos.length > 0 && (
            <p className="py-2 text-center text-[10px] text-sky-200/50">
              Showing {videos.length} of {total} trailer
              {total === 1 ? "" : "s"}
            </p>
          )}

          {hasMore && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              className="mb-4 w-full rounded-full border border-sky-500/50 bg-sky-950/60 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-900/80 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Show more trailers"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
