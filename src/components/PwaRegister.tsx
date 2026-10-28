"use client";

import { useEffect } from "react";

/**
 * Registers the TvPays service worker for installable PWA (HTTPS or localhost).
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") {
      // Avoid SW fighting Turbopack HMR during local dev.
      return;
    }
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  return null;
}
