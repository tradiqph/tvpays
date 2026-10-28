"use client";

import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { formatDateManila } from "@/lib/format";
import type { MemberNotification } from "@/lib/member-notifications";
import { GlassPanel } from "@/components/member/GlassPanel";

type Props = {
  notifications: MemberNotification[];
  loading: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
};

export function MemberNotificationsSheet({
  notifications,
  loading,
  onClose,
  onMarkRead,
}: Props) {
  return (
    <GlassPanel className="rounded-t-3xl border-b-0 px-4 pb-8 pt-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/50 bg-sky-950/60">
            <Bell className="h-4 w-4 text-sky-200" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Notifications</h2>
            <p className="text-[11px] text-sky-200/65">Tasks, wallet, and membership</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-sky-600/50 px-3 py-1 text-xs font-semibold text-sky-200"
        >
          Close
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-sky-200/70">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="py-10 text-center text-sm text-sky-200/70">
          You&apos;re all caught up — no new alerts.
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const inner = (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-sky-100/75">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[10px] text-sky-300/50">
                    {formatDateManila(n.createdAt)}
                  </p>
                </div>
                {n.href ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-sky-400/80" />
                ) : null}
              </>
            );

            return (
              <li key={n.id}>
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => {
                      onMarkRead(n.id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-sky-500/25 bg-[#0a1f52]/70 px-3 py-3 transition hover:border-sky-400/45 hover:bg-[#0d2868]/80"
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMarkRead(n.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-sky-500/25 bg-[#0a1f52]/70 px-3 py-3 text-left"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassPanel>
  );
}
