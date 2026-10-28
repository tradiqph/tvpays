"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, ListVideo, Lock, X } from "lucide-react";
import { VideoLoaderOrb } from "@/components/media/VideoLoaderOrb";
import { DramaPlayer } from "@/components/media/DramaPlayer";
import type { DramaEpisodes, DramaPlatform } from "@/lib/shortdrama";
import { getPreferences } from "@/lib/preferences";
import { saveDramaToList, useDramaSavedList } from "@/lib/drama-saved-list";

type Series = DramaEpisodes & { platform: DramaPlatform };

type Props = {
  series: Series;
  seriesLoading: boolean;
  episodeIdx: number;
  streamUrls: Record<string, string | null>;
  streamLoading: boolean;
  episodeNotice: string | null;
  proxiedPoster: (src: string | null | undefined) => string | null;
  onClose: () => void;
  onSelectEpisode: (s: Series, index: number) => void;
  onEpisodeComplete: (
    engagedWatchSeconds: number,
    fileDurationSeconds: number | null,
    peakPlaybackSeconds: number,
  ) => void;
  onRetryStream: () => void;
};

function nextUnlockedIndex(episodes: Series["episodes"], from: number, dir: 1 | -1) {
  if (dir === 1) {
    return episodes.findIndex((ep, i) => i > from && !ep.isLocked);
  }
  for (let i = from - 1; i >= 0; i--) {
    if (!episodes[i].isLocked) return i;
  }
  return -1;
}

export function DramaSeriesFeed({
  series,
  seriesLoading,
  episodeIdx,
  streamUrls,
  streamLoading,
  episodeNotice,
  proxiedPoster,
  onClose,
  onSelectEpisode,
  onEpisodeComplete,
  onRetryStream,
}: Props) {
  const feedRef = useRef<HTMLDivElement>(null);
  const scrollProgrammatic = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swipeHintVisible, setSwipeHintVisible] = useState(true);
  const { isSaved, toggleDramaSaved } = useDramaSavedList();

  useEffect(() => {
    setSwipeHintVisible(true);
    const t = window.setTimeout(() => setSwipeHintVisible(false), 3000);
    return () => window.clearTimeout(t);
  }, [series.id]);
  const saved = isSaved(series.platform, series.id);
  const currentEp = series.episodes[episodeIdx];

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const el = feedRef.current;
    if (!el) return;
    scrollProgrammatic.current = true;
    el.scrollTo({
      top: index * el.clientHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    window.setTimeout(() => {
      scrollProgrammatic.current = false;
    }, smooth ? 450 : 50);
  }, []);

  useEffect(() => {
    if (seriesLoading) return;
    scrollToIndex(episodeIdx, false);
    // Align feed once when this series finishes loading (not on every index change).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesLoading, series.id]);

  useEffect(() => {
    if (!saved || !currentEp) return;
    saveDramaToList({
      dramaId: series.id,
      platform: series.platform,
      title: series.title,
      cover: series.cover,
      episodeNumber: currentEp.number,
      episodeId: currentEp.id,
    });
  }, [
    saved,
    series.id,
    series.platform,
    series.title,
    series.cover,
    currentEp?.id,
    currentEp?.number,
  ]);

  const onFeedScroll = useCallback(() => {
    if (scrollProgrammatic.current) return;
    const el = feedRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h <= 0) return;
    const i = Math.round(el.scrollTop / h);
    if (i !== episodeIdx && i >= 0 && i < series.episodes.length) {
      onSelectEpisode(series, i);
    }
  }, [episodeIdx, onSelectEpisode, series]);

  function pickEpisode(i: number) {
    setPickerOpen(false);
    onSelectEpisode(series, i);
    scrollToIndex(i);
  }

  function afterEpisodeEnded() {
    if (!getPreferences().autoplayNext) return;
    const next = nextUnlockedIndex(series.episodes, episodeIdx, 1);
    if (next >= 0) {
      onSelectEpisode(series, next);
      scrollToIndex(next);
    }
  }

  return (
    <motion.div
      className="absolute inset-0 z-40 flex min-h-0 flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 pb-8 pt-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">
            {series.title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-white/20"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={feedRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-y-contain scroll-smooth"
        onScroll={onFeedScroll}
      >
        {series.episodes.map((ep, i) => {
          const active = i === episodeIdx;
          const cached = streamUrls[ep.id];
          const streamCached = cached !== undefined;
          const src = streamCached ? cached : null;
          const pending =
            active && !ep.isLocked && !streamCached && (streamLoading || seriesLoading);
          const failed = active && !ep.isLocked && streamCached && cached === null;

          return (
            <section
              key={ep.id}
              className="relative h-full w-full shrink-0 snap-start snap-always bg-black"
            >
              {active && pending && (
                <VideoLoaderOrb variant="orbit" label="Loading episode…" />
              )}
              {active && !ep.isLocked && src && !pending && (
                <div className="absolute inset-0">
                  <DramaPlayer
                    key={`${ep.id}-${src}`}
                    layout="feed"
                    src={src}
                    poster={proxiedPoster(ep.image ?? series.cover)}
                    subtitles={ep.subtitles}
                    durationSeconds={ep.duration}
                    onEpisodeComplete={onEpisodeComplete}
                    onEnded={afterEpisodeEnded}
                  />
                </div>
              )}
              {active && failed && (
                <div className="flex flex-col items-center gap-3 px-6 text-center text-sm text-slate-300">
                  <span>Couldn&apos;t load this episode.</span>
                  <button
                    type="button"
                    className="rounded-full bg-sky-600 px-4 py-2 text-xs font-bold text-white"
                    onClick={onRetryStream}
                  >
                    Try again
                  </button>
                </div>
              )}
              {active && ep.isLocked && (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Lock className="h-8 w-8" />
                  <span className="text-sm">This episode is locked.</span>
                </div>
              )}
              {!active && (
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40"
                  style={{
                    backgroundImage: proxiedPoster(ep.image ?? series.cover)
                      ? `url(${proxiedPoster(ep.image ?? series.cover)})`
                      : undefined,
                  }}
                />
              )}
              <div className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-10 pb-14">
                <p className="text-sm font-bold text-white drop-shadow-md">
                  Episode {ep.number}
                </p>
              </div>
            </section>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-[max(4.5rem,env(safe-area-inset-bottom))] z-20 px-4 text-center">
        {episodeNotice && (
          <p className="pointer-events-auto text-xs font-semibold text-emerald-300 drop-shadow">
            {episodeNotice}
          </p>
        )}
        {swipeHintVisible && !episodeNotice && (
          <motion.p
            className="mt-1 text-[11px] text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Swipe up for the next episode
          </motion.p>
        )}
      </div>

      <div className="absolute right-3 top-[38%] z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex flex-col items-center gap-1 rounded-xl bg-black/45 px-2.5 py-3 text-white ring-1 ring-white/25 backdrop-blur-sm"
          aria-label="Episode list"
        >
          <ListVideo className="h-6 w-6" />
          <span className="text-[10px] font-bold tracking-wide">EP</span>
        </button>
        <button
          type="button"
          disabled={!currentEp}
          onClick={() => {
            if (!currentEp) return;
            toggleDramaSaved({
              dramaId: series.id,
              platform: series.platform,
              title: series.title,
              cover: series.cover,
              episodeNumber: currentEp.number,
              episodeId: currentEp.id,
            });
          }}
          className={`flex flex-col items-center gap-1 rounded-xl px-2.5 py-3 ring-1 backdrop-blur-sm ${
            saved
              ? "bg-sky-500/35 text-sky-100 ring-sky-300/50"
              : "bg-black/45 text-white ring-white/25"
          }`}
          aria-label={saved ? "Remove from my list" : "Save to my list"}
          aria-pressed={saved}
        >
          <Bookmark className={`h-6 w-6 ${saved ? "fill-current" : ""}`} />
          <span className="text-[10px] font-bold tracking-wide">List</span>
        </button>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close episode list"
              className="absolute inset-0 z-30 bg-black/65"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPickerOpen(false)}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 z-40 max-h-[55vh] overflow-hidden rounded-t-2xl border-t border-white/15 bg-[#0a1638]/98 backdrop-blur-md"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="font-bold text-white">
                  Episodes ({series.episodes.length})
                </p>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="rounded-full p-1 text-slate-300 hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-4 py-3 pb-8">
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                  {series.episodes.map((ep, i) => {
                    const locked = ep.isLocked;
                    const active = i === episodeIdx;
                    return (
                      <button
                        key={ep.id}
                        type="button"
                        disabled={locked}
                        onClick={() => pickEpisode(i)}
                        className={`relative flex h-11 items-center justify-center rounded-lg text-sm font-bold ${
                          active
                            ? "bg-gradient-to-b from-[#4fb4ff] to-[#1546c9] text-white shadow-[0_0_12px_rgba(56,160,255,0.55)]"
                            : locked
                              ? "bg-slate-900/80 text-slate-600"
                              : "bg-[#152a5c] text-sky-100 ring-1 ring-sky-400/30"
                        }`}
                      >
                        {ep.number}
                        {locked && (
                          <Lock className="absolute right-0.5 top-0.5 h-2.5 w-2.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
