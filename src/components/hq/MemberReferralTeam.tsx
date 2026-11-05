"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button, Modal } from "@/components/hq/controls";
import { EmptyState } from "@/components/hq/ui";
import { dateTime, humanize } from "@/lib/hq/format";
import type { ReferralTeamCounts } from "@/lib/hq/member-audit";

const LEVELS = [
  { level: 1 as const, label: "L1" },
  { level: 2 as const, label: "L2" },
  { level: 3 as const, label: "L3" },
];

type TeamRow = {
  id: string;
  member_code: string;
  display_name: string | null;
  plan_slug: string;
  created_at: string;
};

export function MemberReferralTeamStat({
  memberId,
  counts,
}: {
  memberId: string;
  counts: ReferralTeamCounts;
}) {
  const [open, setOpen] = useState(false);
  const total = counts.l1 + counts.l2 + counts.l3;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative h-full w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0d1b3d]/80 to-[#081229]/80 p-4 text-left transition-colors hover:border-violet-400/40 hover:from-violet-500/10"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-slate-400">Referral team</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-violet-400/25 to-violet-600/5 text-violet-300 ring-1 ring-violet-400/30">
            <Users className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">
          {total.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          L1 {counts.l1} · L2 {counts.l2} · L3 {counts.l3}
          <span className="mt-0.5 block text-[10px] text-violet-300/80 group-hover:text-violet-200">
            Tap to view downlines
          </span>
        </p>
      </button>

      <MemberReferralTeamModal
        memberId={memberId}
        counts={counts}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function MemberReferralTeamModal({
  memberId,
  counts,
  open,
  onClose,
}: {
  memberId: string;
  counts: ReferralTeamCounts;
  open: boolean;
  onClose: () => void;
}) {
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        section: "referrals",
        level: String(level),
        limit: String(limit),
        offset: String(offset),
      });
      const res = await fetch(
        `/api/hq/members/${memberId}/audit?${params.toString()}`,
      );
      const json = (await res.json()) as {
        rows?: TeamRow[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Load failed");
      setRows(json.rows ?? []);
      setTotal(Number(json.total) || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [memberId, level, offset, open]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [level, open]);

  const levelCount =
    level === 1 ? counts.l1 : level === 2 ? counts.l2 : counts.l3;
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;

  return (
    <Modal open={open} onClose={onClose} title="Referral team">
      <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto">
        <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
          {LEVELS.map(({ level: lv, label }) => {
            const n = lv === 1 ? counts.l1 : lv === 2 ? counts.l2 : counts.l3;
            return (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  level === lv
                    ? "bg-violet-500/25 text-violet-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label} ({n})
              </button>
            );
          })}
        </div>

        {error && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        {loading && (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        )}

        {!loading && rows.length === 0 && (
          <EmptyState title={`No L${level} members`} />
        )}

        {!loading && rows.length > 0 && (
          <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06]">
            {rows.map((r) => (
              <li key={r.id} className="px-3 py-2.5 text-sm">
                <Link
                  href={`/hq/members/${r.id}`}
                  onClick={onClose}
                  className="font-medium text-sky-300 hover:underline"
                >
                  {r.display_name ?? "Unnamed"} · TVP{r.member_code}
                </Link>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  {humanize(r.plan_slug)} · {dateTime(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!loading && total > limit && (
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Page {page} of {pages} · {levelCount} L{level} total
            </span>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                disabled={offset <= 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                disabled={offset + limit >= total || loading}
                onClick={() => setOffset(offset + limit)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
