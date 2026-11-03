"use client";

import { useState } from "react";

export function TrailerCatalogSync() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/videos/sync", { method: "POST" });
      const json = (await res.json()) as {
        error?: string;
        upserted?: number;
        channelId?: string;
        totalFetched?: number;
      };
      if (!res.ok) {
        setMessage(json.error ?? "Sync failed");
        return;
      }
      setMessage(
        `Synced ${json.upserted ?? 0} trailers (${json.totalFetched ?? "?"} fetched from MovieGasm).`,
      );
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-400">
        Pull latest trailers from{" "}
        <span className="text-sky-200">youtube.com/@MovieGasm</span> into the
        Media catalog.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void sync()}
        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Syncing…" : "Sync MovieGasm now"}
      </button>
      {message && (
        <p className="text-sm text-sky-200/90" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
