"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "tvpays-legacy-sw-cleared";

/**
 * TvPays does not ship a service worker. A leftover `sw.js` on localhost (from
 * another project or an old PWA) intercepts navigations and causes
 * net::ERR_CACHE_MISS on `/media` and broken playback.
 */
export function UnregisterLegacyServiceWorkers() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then(async (regs) => {
      if (regs.length === 0) return;
      const cleared = await Promise.all(regs.map((r) => r.unregister()));
      if (cleared.some(Boolean) && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
      }
    });
  }, []);

  return null;
}
