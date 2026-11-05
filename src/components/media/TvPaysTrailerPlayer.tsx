"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import { useYoutubePlayer } from "@/components/media/useYoutubePlayer";

const WATCH_SECONDS = 10;

type Props = {
  youtubeId: string;
  title: string;
  posterSrc: string;
  onPosterError: () => void;
  watchStarted: boolean;
  onStartWatch: () => void;
  credited: boolean;
  crediting: boolean;
  countdown: number;
  onSkip: () => void;
  /** After credit, allow pause/play without blocking the iframe. */
  controlsUnlocked: boolean;
};

export function TvPaysTrailerPlayer({
  youtubeId,
  title,
  posterSrc,
  onPosterError,
  watchStarted,
  onStartWatch,
  credited,
  crediting,
  countdown,
  onSkip,
  controlsUnlocked,
}: Props) {
  const playerMountRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const shieldActive = watchStarted && !controlsUnlocked;

  const { play, pause } = useYoutubePlayer(playerMountRef, youtubeId, {
    active: watchStarted,
    onReady: (player) => {
      player.playVideo();
      setPaused(false);
    },
    onStateChange: (state) => {
      if (state === 2) setPaused(true);
      if (state === 1) setPaused(false);
    },
  });

  function togglePause() {
    if (paused) {
      play();
      setPaused(false);
    } else {
      pause();
      setPaused(true);
    }
  }

  return (
    <div
      className="relative w-full bg-black"
      style={{ aspectRatio: "16 / 9", minHeight: "15.5rem" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {/* Scale + shift down to clip YouTube top bar (channel name) and bottom chrome */}
        <div
          className={`absolute left-1/2 top-1/2 h-[118%] w-[112%] -translate-x-1/2 -translate-y-[44%] ${
            watchStarted ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div ref={playerMountRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
        </div>
      </div>

      {watchStarted && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[15] h-12 bg-gradient-to-b from-black from-55% via-black/90 to-transparent"
          aria-hidden
        />
      )}

      {!watchStarted && (
        <>
          <Image
            src={posterSrc}
            alt={title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
            onError={onPosterError}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
          <button
            type="button"
            onClick={onStartWatch}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2"
            aria-label="Start watching this trailer"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/95 shadow-[0_0_24px_rgba(220,38,38,0.65)] ring-4 ring-white/30">
              <Play className="ml-1 h-8 w-8 fill-white text-white" />
            </span>
            <span className="rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white">
              {credited ? "Tap to continue watching" : "Tap to watch · 10s to earn"}
            </span>
          </button>
          {credited && (
            <span className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white">
              Ad credited today
            </span>
          )}
        </>
      )}

      {watchStarted && shieldActive && (
        <div
          className="absolute inset-0 z-10 touch-none"
          aria-hidden
          onContextMenu={(e) => e.preventDefault()}
        />
      )}

      {watchStarted && controlsUnlocked && (
        <button
          type="button"
          onClick={togglePause}
          className="absolute left-3 top-14 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-sm"
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? (
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          ) : (
            <Pause className="h-5 w-5 fill-current" />
          )}
        </button>
      )}

      {watchStarted && !credited && countdown > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent px-3 pb-12 pt-8">
          <p className="text-center text-xs text-sky-100/90">
            Watch Ads for {WATCH_SECONDS} seconds to credit your points.
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-2">
        {watchStarted && !credited && (
          <button
            type="button"
            disabled={countdown > 0 || crediting}
            onClick={onSkip}
            className="pointer-events-auto rounded-full border border-sky-400/50 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {countdown > 0 ? `Skip in ${countdown} ›` : crediting ? "…" : "Skip ›"}
          </button>
        )}
        {watchStarted && credited && (
          <span className="rounded-full bg-emerald-600/90 px-3 py-1.5 text-xs font-semibold text-white">
            Ad credited today
          </span>
        )}
      </div>
    </div>
  );
}

export { WATCH_SECONDS as TRAILER_WATCH_SECONDS };
