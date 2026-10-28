"use client";

import { useEffect, useRef, useState } from "react";
import type Hls from "hls.js";

type Props = {
  src: string;
  poster?: string | null;
  subtitles?: { language: string; label: string; url: string }[];
  durationSeconds?: number | null;
  onEnded?: () => void;
  /** Fired once when the episode ends; includes max seconds watched. */
  onEpisodeComplete?: (watchSeconds: number) => void;
  /** `feed` fills vertical watch UI; `card` is the catalog sheet size. */
  layout?: "card" | "feed";
};

function toHttps(url: string): string {
  return url.startsWith("http://") ? `https://${url.slice(7)}` : url;
}

/** Vertical HLS player: hls.js on desktop Chrome/Edge; native HLS on Safari/iOS. */
export function DramaPlayer({
  src,
  poster,
  subtitles = [],
  durationSeconds,
  onEnded,
  onEpisodeComplete,
  layout = "card",
}: Props) {
  const shellClass =
    layout === "feed"
      ? "relative h-full w-full bg-black"
      : "relative mx-auto aspect-[9/16] max-h-[62vh] w-full overflow-hidden rounded-2xl bg-black";
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchRef = useRef(0);
  const completedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    maxWatchRef.current = 0;
    completedRef.current = false;
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    let hls: Hls | null = null;
    let cancelled = false;

    const playbackSrc = toHttps(src);
    const isHls = /\.m3u8(\?|$)/i.test(playbackSrc);

    const onVideoError = () => {
      if (!cancelled && !isHls) {
        setError("Couldn't load this episode.");
      }
    };
    video.addEventListener("error", onVideoError);

    const setup = async () => {
      if (isHls) {
        const { default: HlsCtor } = await import("hls.js");
        if (cancelled) return;

        if (HlsCtor.isSupported()) {
          hls = new HlsCtor({
            enableWorker: true,
            xhrSetup(xhr) {
              xhr.withCredentials = false;
            },
          });
          hls.loadSource(playbackSrc);
          hls.attachMedia(video);
          hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
            if (!cancelled) void video.play().catch(() => {});
          });
          hls.on(HlsCtor.Events.ERROR, (_e, data) => {
            if (cancelled || !data.fatal) return;
            setError("Couldn't load this episode.");
          });
          return;
        }

        const nativeHls = video.canPlayType("application/vnd.apple.mpegurl");
        if (nativeHls === "probably" || nativeHls === "maybe") {
          video.src = playbackSrc;
          video.load();
          return;
        }

        setError("This browser can't play the stream.");
        return;
      }

      video.src = playbackSrc;
      video.load();
    };

    void setup();

    return () => {
      cancelled = true;
      video.removeEventListener("error", onVideoError);
      hls?.destroy();
      hls = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <div className={shellClass}>
      <video
        ref={videoRef}
        className={
          layout === "feed"
            ? "h-full w-full object-cover"
            : "h-full w-full object-contain"
        }
        poster={poster ?? undefined}
        controls
        playsInline
        preload="auto"
        crossOrigin={subtitles.length ? "anonymous" : undefined}
        onTimeUpdate={() => {
          const t = videoRef.current?.currentTime ?? 0;
          if (t > maxWatchRef.current) maxWatchRef.current = t;
        }}
        onEnded={() => {
          if (!completedRef.current) {
            completedRef.current = true;
            const watched = Math.ceil(
              maxWatchRef.current || videoRef.current?.currentTime || 0,
            );
            onEpisodeComplete?.(watched);
          }
          onEnded?.();
        }}
      >
        {subtitles.map((s, i) => (
          <track
            key={s.url}
            kind="subtitles"
            src={s.url}
            srcLang={s.language}
            label={s.label}
            default={i === 0}
          />
        ))}
      </video>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-sm text-slate-200">
          {error}
        </div>
      )}
    </div>
  );
}
