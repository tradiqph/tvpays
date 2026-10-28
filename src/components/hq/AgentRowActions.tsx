"use client";

import { useState } from "react";

export function AgentRowActions({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  async function decide(approve: boolean) {
    setLoading(true);
    await fetch("/api/hq/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, approve }),
    });
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => decide(true)}
        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        Approve
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={() => decide(false)}
        className="rounded bg-red-800 px-2 py-1 text-xs text-white disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
