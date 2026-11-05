"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  defaultPlayerVars,
  ensureYoutubeIframeApi,
} from "@/lib/youtube-iframe-api";

type Options = {
  /** When false, player is destroyed. */
  active: boolean;
  onReady?: (player: YT.Player) => void;
  onStateChange?: (state: YT.PlayerState) => void;
};

export function useYoutubePlayer(
  containerRef: RefObject<HTMLDivElement | null>,
  videoId: string,
  { active, onReady, onStateChange }: Options,
) {
  const playerRef = useRef<YT.Player | null>(null);
  const onReadyRef = useRef(onReady);
  const onStateRef = useRef(onStateChange);
  onReadyRef.current = onReady;
  onStateRef.current = onStateChange;

  useEffect(() => {
    if (!active || !videoId || !containerRef.current) {
      playerRef.current?.destroy();
      playerRef.current = null;
      return;
    }

    const mountEl = containerRef.current;
    let cancelled = false;

    void ensureYoutubeIframeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;

      playerRef.current?.destroy();
      playerRef.current = null;

      playerRef.current = new YT.Player(mountEl, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        width: "100%",
        height: "100%",
        playerVars: defaultPlayerVars(),
        events: {
          onReady: (event) => {
            if (!cancelled) onReadyRef.current?.(event.target);
          },
          onStateChange: (event) => {
            if (!cancelled) onStateRef.current?.(event.data);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [active, videoId, containerRef]);

  return {
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    getPlayer: () => playerRef.current,
  };
}
