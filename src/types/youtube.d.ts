/** Minimal YouTube IFrame Player API types for client embeds. */
declare namespace YT {
  type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;

  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    modestbranding?: 0 | 1;
    rel?: 0 | 1;
    fs?: 0 | 1;
    iv_load_policy?: 1 | 3;
    disablekb?: 0 | 1;
    playsinline?: 0 | 1;
    origin?: string;
  }

  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    host?: string;
    playerVars?: PlayerVars;
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { data: PlayerState; target: Player }) => void;
      onError?: (event: { data: number; target: Player }) => void;
    };
  }

  class Player {
    constructor(elementId: HTMLElement | string, options: PlayerOptions);
    destroy(): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    getPlayerState(): PlayerState;
    getCurrentTime(): number;
    getDuration(): number;
    mute(): void;
    unMute(): void;
  }
}

interface Window {
  YT?: typeof YT;
  onYouTubeIframeAPIReady?: () => void;
}
