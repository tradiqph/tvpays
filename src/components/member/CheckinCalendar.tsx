"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";
import { GlassCard } from "@/components/member/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { manilaViewDate } from "@/lib/manila-date";
import { formatPhp } from "@/lib/format";
import { DAILY_CHECKIN_PHP } from "@/lib/plans";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type Props = {
  onCheckin: () => void;
  checkinLoading: boolean;
  /** Bump to force a reload (e.g. after a successful check-in). */
  refreshKey: number;
};

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function prevDay(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function CheckinCalendar({ onCheckin, checkinLoading, refreshKey }: Props) {
  const [today, setToday] = useState<string | null>(null);
  const [view, setView] = useState({ y: 0, m: 0 });

  useEffect(() => {
    const d = manilaViewDate();
    setToday(d);
    const [y, m] = d.split("-").map(Number);
    setView({ y, m: m - 1 });
  }, []);

  const todayY = today ? Number(today.split("-")[0]) : view.y;
  const todayM = today ? Number(today.split("-")[1]) : view.m + 1;
  const [days, setDays] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("daily_checkins")
      .select("checkin_date")
      .eq("user_id", user.id)
      .order("checkin_date", { ascending: false })
      .limit(400);
    setDays(new Set((data ?? []).map((r) => r.checkin_date)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const checkedToday = today ? days.has(today) : false;

  const streak = useMemo(() => {
    if (!today) return 0;
    let cursor = checkedToday ? today : prevDay(today);
    let n = 0;
    while (days.has(cursor)) {
      n += 1;
      cursor = prevDay(cursor);
    }
    return n;
  }, [days, today, checkedToday]);

  const monthPrefix = ymd(view.y, view.m, 1).slice(0, 8);
  const monthCount = useMemo(
    () => [...days].filter((d) => d.startsWith(monthPrefix)).length,
    [days, monthPrefix],
  );

  const firstWeekday = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );
  const isCurrentMonth = view.y === todayY && view.m === todayM - 1;

  function shift(delta: number) {
    setView(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  if (!today) {
    return (
      <GlassCard className="mb-4 p-3 text-sm text-sky-200/70">
        Loading check-in…
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mb-4 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 p-3 text-left"
      >
        <CalendarCheck className="h-5 w-5 shrink-0 text-emerald-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Daily Check-in</p>
          <p className="text-[10px] text-sky-100/70">
            {!loaded
              ? "Loading…"
              : checkedToday
                ? "Checked in today ✓"
                : `Check in today for +${formatPhp(DAILY_CHECKIN_PHP)}`}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
          <Flame className="h-3.5 w-3.5" />
          {streak}
        </span>
        {loaded && !checkedToday && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-sky-300 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
          <div className="border-t border-sky-800/50 px-3 pb-3 pt-2">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shift(-1)}
          className="rounded-full p-1 text-sky-300 hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-xs font-semibold text-white">
          {monthLabel}
          <span className="ml-1.5 font-normal text-sky-200/60">
            · {monthCount} day{monthCount === 1 ? "" : "s"}
          </span>
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => shift(1)}
          className="rounded-full p-1 text-sky-300 hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] font-semibold text-slate-500">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <span key={`e${i}`} />;
          const date = ymd(view.y, view.m, day);
          const done = days.has(date);
          const isToday = date === today;
          const future = date > today;
          return (
            <span
              key={date}
              className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-semibold ${
                done
                  ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.45)]"
                  : isToday
                    ? "border border-sky-400 bg-sky-500/20 text-white"
                    : future
                      ? "text-slate-600"
                      : "bg-slate-800/50 text-slate-400"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : day}
            </span>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!loaded || checkedToday || checkinLoading}
        onClick={onCheckin}
        className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-[0.99] ${
          checkedToday
            ? "cursor-default bg-slate-800/80 text-emerald-300"
            : "bg-gradient-to-b from-emerald-500 to-emerald-700 shadow-[0_4px_16px_rgba(16,185,129,0.3)] disabled:opacity-60"
        }`}
      >
        {checkedToday
          ? "Checked in today ✓ Come back tomorrow"
          : checkinLoading
            ? "Checking in…"
            : `Check in today · +${formatPhp(DAILY_CHECKIN_PHP)}`}
      </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
