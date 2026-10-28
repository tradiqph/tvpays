"use client";

import Link from "next/link";
import { Target, CheckCircle2, Circle } from "lucide-react";
import { GlassCard } from "@/components/member/GlassCard";
import { formatPhp } from "@/lib/format";
import {
  packageStatusLabel,
  type MemberPackagesPayload,
  type PackageTask,
  type PlanPackageTask,
} from "@/lib/member-packages";

function PlanTaskRow({ task }: { task: PlanPackageTask }) {
  const pct =
    task.target > 0
      ? Math.min(100, Math.round((task.progress / task.target) * 100))
      : 0;
  const earnedTodayDisplay =
    Math.min(task.progress, task.target) * task.perEpisodeDisplay;

  return (
    <GlassCard className="p-3">
      <div className="flex items-start gap-3">
        {task.done ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-sky-500/70" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{task.planName}</p>
            <span className="text-[10px] uppercase text-sky-300/70">
              {packageStatusLabel(task.status)}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Daily episodes · {task.periodLabel}
          </p>
          <p className="mt-1 text-lg font-extrabold text-white">
            {task.progress}/{task.target}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-sky-100/75">
            Up to {formatPhp(task.dailyPotentialDisplay)}/day ·{" "}
            {formatPhp(task.perEpisodeDisplay)} per earning episode
            {task.status === "active" && task.progress > 0 && (
              <> · ~{formatPhp(earnedTodayDisplay)} toward today&apos;s cap*</>
            )}
          </p>
        </div>
        {task.status === "active" && (
          <Link
            href="/media"
            className="shrink-0 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {task.done ? "View" : "Go"}
          </Link>
        )}
      </div>
    </GlassCard>
  );
}

function GlobalTaskRow({
  task,
  onCheckin,
  checkinLoading,
}: {
  task: PackageTask;
  onCheckin: () => void;
  checkinLoading: boolean;
}) {
  const pct =
    task.target > 0
      ? Math.min(100, Math.round((task.progress / task.target) * 100))
      : 0;

  return (
    <GlassCard className="p-3">
      <div className="flex items-start gap-3">
        {task.done ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-sky-500/70" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{task.title}</p>
          <p className="text-xs text-slate-400">{task.description}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-sky-200/70">
            {task.progress} / {task.target}
          </p>
        </div>
        {task.href && (
          <Link
            href={task.href}
            className="shrink-0 rounded-full bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            {task.done ? "View" : "Go"}
          </Link>
        )}
        {task.action === "checkin" && !task.done && (
          <button
            type="button"
            disabled={checkinLoading}
            onClick={onCheckin}
            className="shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {checkinLoading ? "…" : "Claim"}
          </button>
        )}
      </div>
    </GlassCard>
  );
}

type Props = {
  data: MemberPackagesPayload;
  onCheckin: () => void;
  checkinLoading: boolean;
};

export function MemberTasksSection({ data, onCheckin, checkinLoading }: Props) {
  const activeCount = data.planTasks.filter((t) => t.status === "active").length;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sky-200/90">
        <Target className="h-4 w-4" />
        Tasks to achieve
      </h2>

      <GlassCard className="mb-3 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300/80">
          Today (active plans)
        </p>
        <p className="mt-1 text-2xl font-black text-white">
          {data.episodeTotals.todayProgress}/{data.episodeTotals.todayTargetActive}
        </p>
        <p className="mt-1 text-[11px] text-sky-100/70">
          {activeCount} active package{activeCount === 1 ? "" : "s"}
          {" · "}
          One episode counts toward every activated tier (finish{" "}
          {data.episodeTotals.todayTargetActive} today — up to{" "}
          {formatPhp(data.episodeTotals.dailyPotentialAllActivated)}/day display*
          across {data.packages.filter((p) => p.slug !== "trial").length} paid
          plan
          {data.packages.filter((p) => p.slug !== "trial").length === 1
            ? ""
            : "s"}
          )
        </p>
        <Link
          href="/media"
          className="mt-2 inline-block rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white"
        >
          Watch episodes
        </Link>
      </GlassCard>

      {data.planTasks.length > 0 && (
        <>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            By activated plan
          </p>
          <ul className="mb-3 space-y-2">
            {data.planTasks.map((task) => (
              <li key={task.id}>
                <PlanTaskRow task={task} />
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Shared goals
      </p>
      <ul className="space-y-2">
        {data.globalTasks.map((task) => (
          <li key={task.id}>
            <GlobalTaskRow
              task={task}
              onCheckin={onCheckin}
              checkinLoading={checkinLoading}
            />
          </li>
        ))}
      </ul>

      <p className="mt-3 text-center text-[10px] text-slate-500">
        *Displayed projections, not guaranteed earnings.
      </p>
    </section>
  );
}
