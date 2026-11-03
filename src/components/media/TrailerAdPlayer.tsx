"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Eye, Play, Share2, Wallet } from "lucide-react";
import { formatPhp } from "@/lib/format";
import { formatViewCount } from "@/lib/youtube-rss";
import type { VideoListItem } from "@/app/api/videos/route";

const WATCH_SECONDS = 10;

type Props = {
  video: VideoListItem;
  planName: string;
  adsToday: number;
  adsLimit: number;
  onCredited: (payload: {
    adsToday: number;
    adsLimit: number;
    amount: number;
  }) => void;
  onNotice: (msg: string) => void;
};

export function TrailerAdPlayer({
  video,
  planName,
  adsToday,
  adsLimit,
  onCredited,
  onNotice,
}: Props) {
  const [watchStarted, setWatchStarted] = useState(false);
  const [countdown, setCountdown] = useState(WATCH_SECONDS);
  const [crediting, setCrediting] = useState(false);
  const [credited, setCredited] = useState(video.credited_today);
  const [posterSrc, setPosterSrc] = useState(
    `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`,
  );
  const watchStartRef = useRef<number | null>(null);
  const creditedRef = useRef(false);

  useEffect(() => {
    setWatchStarted(false);
    setCountdown(WATCH_SECONDS);
    watchStartRef.current = null;
    setCredited(video.credited_today);
    creditedRef.current = video.credited_today;
    setPosterSrc(
      `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`,
    );
  }, [video.id, video.youtube_id]);

  useEffect(() => {
    if (video.credited_today) {
      setCredited(true);
      creditedRef.current = true;
    }
  }, [video.credited_today, video.id]);

  useEffect(() => {
    if (!watchStarted || credited || creditedRef.current) return;
    if (countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [countdown, credited, watchStarted, video.id]);

  const claimReward = useCallback(async () => {
    if (crediting || credited || creditedRef.current) return;
    const elapsed = watchStartRef.current
      ? Math.floor((Date.now() - watchStartRef.current) / 1000)
      : 0;
    if (elapsed < WATCH_SECONDS) return;

    setCrediting(true);
    try {
      const res = await fetch("/api/economy/ad-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: video.id,
          watched_seconds: elapsed,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        amount?: number;
        adsToday?: number;
        adsLimit?: number;
      };
      if (!res.ok) {
        onNotice(json.error ?? "Could not credit this ad.");
        return;
      }
      creditedRef.current = true;
      setCredited(true);
      onCredited({
        adsToday: json.adsToday ?? adsToday,
        adsLimit: json.adsLimit ?? adsLimit,
        amount: json.amount ?? 0,
      });
      onNotice(
        json.amount
          ? `+${formatPhp(json.amount)} credited (${json.adsToday ?? "?"}/${json.adsLimit ?? "?"} ads today).`
          : "Ad credited.",
      );
    } catch {
      onNotice("Network error. Try again.");
    } finally {
      setCrediting(false);
    }
  }, [
    adsLimit,
    adsToday,
    crediting,
    credited,
    onCredited,
    onNotice,
    video.id,
  ]);

  useEffect(() => {
    if (watchStarted && countdown === 0 && !credited && !crediting) {
      void claimReward();
    }
  }, [countdown, claimReward, credited, crediting, watchStarted]);

  function startWatch() {
    setWatchStarted(true);
    if (credited || creditedRef.current) return;
    watchStartRef.current = Date.now();
    setCountdown(WATCH_SECONDS);
  }

  const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_id)}?rel=0&modestbranding=1&autoplay=1`;

  return (
    <div className="relative z-10 shrink-0 overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-950/90 shadow-[0_0_28px_rgba(0,120,255,0.25)]">
      <div
        className="relative w-full bg-black"
        style={{ aspectRatio: "16 / 9", minHeight: "11rem" }}
      >
        {watchStarted ? (
          <iframe
            title={video.title}
            src={embedSrc}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <Image
              src={posterSrc}
              alt={video.title}
              fill
              className="object-cover"
              sizes="(max-width: 480px) 100vw, 400px"
              priority
              onError={() =>
                setPosterSrc(
                  `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`,
                )
              }
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
            <button
              type="button"
              onClick={startWatch}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              aria-label="Start watching this trailer"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/95 shadow-[0_0_24px_rgba(220,38,38,0.65)] ring-4 ring-white/30">
                <Play className="ml-1 h-8 w-8 fill-white text-white" />
              </span>
              <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white">
                {credited || creditedRef.current
                  ? "Tap to continue watching"
                  : "Tap to watch · 10s to earn"}
              </span>
            </button>
            {(credited || creditedRef.current) && (
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white">
                Ad credited today
              </span>
            )}
          </>
        )}

        {watchStarted && !credited && countdown > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-12 pt-8">
            <p className="text-center text-xs text-sky-100/90">
              Watch Ads for {WATCH_SECONDS} seconds to credit your points.
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-2">
          {watchStarted && !credited && !creditedRef.current && (
            <button
              type="button"
              disabled={countdown > 0 || crediting}
              onClick={() => void claimReward()}
              className="pointer-events-auto rounded-full border border-sky-400/50 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {countdown > 0 ? `Skip in ${countdown} ›` : crediting ? "…" : "Skip ›"}
            </button>
          )}
          {watchStarted && (credited || creditedRef.current) && (
            <span className="rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white">
              Ad credited today
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 p-3">
        <h2 className="line-clamp-2 text-sm font-bold text-white">{video.title}</h2>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-sky-200/80">
          <span className="rounded bg-sky-950 px-1.5 py-0.5 font-semibold text-sky-300">
            1 Ad
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatViewCount(video.display_views)}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <Wallet className="h-3.5 w-3.5" />
            Total Ads Fund {formatPhp(video.ads_fund_display)}
          </span>
          <Share2 className="ml-auto h-4 w-4 text-sky-400/70" />
        </div>
        <p className="text-xs text-slate-400">
          Plan: <span className="text-white">{planName}</span>
          {" · "}
          Total Ads {adsToday}/{adsLimit}
        </p>
      </div>
    </div>
  );
}
