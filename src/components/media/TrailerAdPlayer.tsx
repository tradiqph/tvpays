"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Wallet } from "lucide-react";
import { formatPhp } from "@/lib/format";
import { formatViewCount } from "@/lib/youtube-rss";
import type { VideoListItem } from "@/app/api/videos/route";
import { RewardEarnedOverlay } from "@/components/member/RewardEarnedOverlay";
import { useRewardEarnedFlash } from "@/hooks/useRewardEarnedFlash";
import {
  TRAILER_WATCH_SECONDS,
  TvPaysTrailerPlayer,
} from "@/components/media/TvPaysTrailerPlayer";

type Props = {
  video: VideoListItem;
  planName: string;
  adsToday: number;
  adsLimit: number;
  regularToday: number;
  regularLimit: number;
  forfeitedToday: number;
  forfeitedLimit: number;
  forfeitedBalance: number;
  onCredited: (payload: {
    adsToday: number;
    adsLimit: number;
    amount: number;
    regularToday?: number;
    regularLimit?: number;
    forfeitedToday?: number;
    forfeitedLimit?: number;
    forfeitedBalance?: number;
    kind?: string;
  }) => void;
  onNotice: (msg: string) => void;
  likesRewardedToday: number;
  likeCap: number;
};

export function TrailerAdPlayer({
  video,
  planName,
  adsToday,
  adsLimit,
  regularToday,
  regularLimit,
  forfeitedToday,
  forfeitedLimit,
  forfeitedBalance,
  onCredited,
  onNotice,
  likesRewardedToday,
  likeCap,
}: Props) {
  const [watchStarted, setWatchStarted] = useState(false);
  const [countdown, setCountdown] = useState(TRAILER_WATCH_SECONDS);
  const [crediting, setCrediting] = useState(false);
  const [credited, setCredited] = useState(video.credited_today);
  const [controlsUnlocked, setControlsUnlocked] = useState(video.credited_today);
  const [posterSrc, setPosterSrc] = useState(
    `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`,
  );
  const watchStartRef = useRef<number | null>(null);
  const creditedRef = useRef(false);
  const { earnedAmount, flashKey, celebrateEarned } = useRewardEarnedFlash();

  useEffect(() => {
    setWatchStarted(false);
    setCountdown(TRAILER_WATCH_SECONDS);
    watchStartRef.current = null;
    setCredited(video.credited_today);
    creditedRef.current = video.credited_today;
    setControlsUnlocked(video.credited_today);
    setPosterSrc(
      `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`,
    );
  }, [video.id, video.youtube_id, video.credited_today]);

  useEffect(() => {
    if (video.credited_today) {
      setCredited(true);
      creditedRef.current = true;
      setControlsUnlocked(true);
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
    if (elapsed < TRAILER_WATCH_SECONDS) return;

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
        regularToday?: number;
        regularLimit?: number;
        forfeitedToday?: number;
        forfeitedLimit?: number;
        forfeitedBalance?: number;
        kind?: string;
      };
      if (!res.ok) {
        onNotice(json.error ?? "Could not credit this ad.");
        return;
      }
      creditedRef.current = true;
      setCredited(true);
      setControlsUnlocked(true);
      const amount = json.amount ?? 0;
      onCredited({
        adsToday: json.adsToday ?? adsToday,
        adsLimit: json.adsLimit ?? adsLimit,
        amount,
        regularToday: json.regularToday,
        regularLimit: json.regularLimit,
        forfeitedToday: json.forfeitedToday,
        forfeitedLimit: json.forfeitedLimit,
        forfeitedBalance: json.forfeitedBalance,
        kind: json.kind,
      });
      celebrateEarned(amount);
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
    celebrateEarned,
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
    if (credited || creditedRef.current) {
      setControlsUnlocked(true);
      return;
    }
    watchStartRef.current = Date.now();
    setCountdown(TRAILER_WATCH_SECONDS);
  }

  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.youtube_id)}`;

  return (
    <div className="relative z-10 shrink-0 overflow-hidden rounded-b-2xl border border-x-0 border-t-0 border-sky-500/40 bg-slate-950/90 shadow-[0_0_28px_rgba(0,120,255,0.25)]">
      <RewardEarnedOverlay
        amount={earnedAmount}
        flashKey={flashKey}
        label="Ad reward"
      />
      <TvPaysTrailerPlayer
        youtubeId={video.youtube_id}
        title={video.title}
        posterSrc={posterSrc}
        onPosterError={() =>
          setPosterSrc(
            `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`,
          )
        }
        watchStarted={watchStarted}
        onStartWatch={startWatch}
        credited={credited || creditedRef.current}
        crediting={crediting}
        countdown={countdown}
        onSkip={() => void claimReward()}
        controlsUnlocked={controlsUnlocked}
      />

      <div className="space-y-2 p-3">
        <h2 className="line-clamp-2 text-sm font-bold text-white">
          {video.title}
        </h2>
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
          <a
            href={youtubeWatchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[10px] font-medium text-sky-400/90 underline-offset-2 hover:text-sky-300 hover:underline"
          >
            Open on YouTube
          </a>
        </div>
        <p className="text-xs text-slate-400">
          Plan: <span className="text-white">{planName}</span>
          {" · "}
          Ads {regularToday}/{regularLimit}
          {" · "}
          Likes {Math.min(likesRewardedToday, likeCap)}/{likeCap}
          {forfeitedLimit > 0 && (
            <>
              {" · "}
              Catch-up {forfeitedToday}/{forfeitedLimit}
              {forfeitedBalance > 0 && (
                <> · {formatPhp(forfeitedBalance)} forfeited left</>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
