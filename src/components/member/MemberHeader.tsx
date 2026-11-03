"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { TvPaysLogo } from "./TvPaysLogo";
import { ProfileMenu } from "./ProfileMenu";
import { SlideSheet } from "./SlideSheet";
import { MemberNotificationsSheet } from "./MemberNotificationsSheet";
import type { MemberNotification } from "@/lib/member-notifications";
import { notificationAllowed, usePreferences } from "@/lib/preferences";

const READ_STORAGE_KEY = "tvpays_notification_reads";

function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistReadIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota */
  }
}

type Props = {
  variant?: "default" | "profile";
};

export function MemberHeader({ variant = "default" }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allNotifications, setNotifications] = useState<MemberNotification[]>([]);
  const [prefs] = usePreferences();
  // Hide categories the member switched off in Settings.
  const notifications = useMemo(
    () => allNotifications.filter((n) => notificationAllowed(n.id, prefs)),
    [allNotifications, prefs],
  );
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/member/notifications");
      if (res.ok) {
        const json = (await res.json()) as { notifications: MemberNotification[] };
        setNotifications(json.notifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (sheetOpen) {
      fetchNotifications();
    }
  }, [sheetOpen, fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds],
  );

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
  }

  function openNotifications() {
    setSheetOpen(true);
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) {
        next.add(n.id);
      }
      persistReadIds(next);
      return next;
    });
  }

  const bellSize = variant === "profile" ? "h-11 w-11" : "h-9 w-9";
  const bellIconSize = variant === "profile" ? "h-5 w-5" : "h-4 w-4";

  return (
    <>
      <header className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
        <TvPaysLogo />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openNotifications}
            className={`relative flex ${bellSize} items-center justify-center rounded-full border-2 border-sky-200/80 bg-gradient-to-b from-[#4fb4ff] to-[#1546c9] shadow-[0_0_16px_rgba(56,150,255,0.6),inset_0_2px_3px_rgba(255,255,255,0.55)]`}
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell className={`${bellIconSize} fill-white/30 text-white`} />
            {unreadCount > 0 ? (
              <span className="absolute right-0 top-0 flex h-3 min-w-3 items-center justify-center rounded-full border-2 border-[#0b2a7a] bg-red-500 px-0.5 text-[8px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
          {variant === "default" ? <ProfileMenu /> : null}
        </div>
      </header>

      <SlideSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <MemberNotificationsSheet
          notifications={notifications}
          loading={loading}
          onClose={() => setSheetOpen(false)}
          onMarkRead={markRead}
        />
      </SlideSheet>
    </>
  );
}
