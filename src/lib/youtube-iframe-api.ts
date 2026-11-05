let apiReady: Promise<typeof YT> | null = null;

const SCRIPT_ATTR = "data-yt-iframe-api";

/** Load the YouTube IFrame API once (browser only). */
export function ensureYoutubeIframeApi(): Promise<typeof YT> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API requires a browser"));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (!apiReady) {
    apiReady = new Promise((resolve, reject) => {
      const finish = () => {
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error("YouTube IFrame API failed to initialize"));
      };

      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        finish();
      };

      if (document.querySelector(`script[${SCRIPT_ATTR}]`)) {
        const poll = window.setInterval(() => {
          if (window.YT?.Player) {
            window.clearInterval(poll);
            finish();
          }
        }, 50);
        window.setTimeout(() => {
          window.clearInterval(poll);
          if (!window.YT?.Player) reject(new Error("YouTube IFrame API timeout"));
        }, 15_000);
        return;
      }

      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.setAttribute(SCRIPT_ATTR, "1");
      tag.onerror = () => reject(new Error("Could not load YouTube IFrame API"));
      document.head.appendChild(tag);
    });
  }
  return apiReady;
}

export function defaultPlayerVars(): YT.PlayerVars {
  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;
  return {
    autoplay: 1,
    controls: 0,
    modestbranding: 1,
    rel: 0,
    fs: 0,
    iv_load_policy: 3,
    disablekb: 1,
    playsinline: 1,
    ...(origin ? { origin } : {}),
  };
}
