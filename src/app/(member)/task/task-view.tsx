"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MemberHeader } from "@/components/member/MemberHeader";
import { MemberTasksSection } from "@/components/member/MemberTasksSection";
import type { MemberPackagesPayload } from "@/lib/member-packages";

export function TaskView() {
  const [data, setData] = useState<MemberPackagesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/member/packages");
      if (res.ok) {
        setData((await res.json()) as MemberPackagesPayload);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function doCheckin() {
    setCheckinLoading(true);
    const res = await fetch("/api/economy/checkin", { method: "POST" });
    setCheckinLoading(false);
    if (res.ok) load();
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader variant="profile" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-white">Tasks</h1>
          <Link
            href="/packages"
            className="text-xs font-medium text-sky-300 underline-offset-2 hover:underline"
          >
            My packages
          </Link>
        </div>

        {loading && (
          <p className="text-center text-sm text-slate-500">Loading…</p>
        )}

        {data && (
          <MemberTasksSection
            data={data}
            onCheckin={doCheckin}
            checkinLoading={checkinLoading}
          />
        )}
      </div>
    </div>
  );
}
