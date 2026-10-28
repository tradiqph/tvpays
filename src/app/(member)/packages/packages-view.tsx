"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Crown,
  Film,
  TrendingUp,
  Wallet,
  ClipboardList,
} from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { GlassCard } from "@/components/member/GlassCard";
import { GlassPanel } from "@/components/member/GlassPanel";
import { PlanBadgeVisual } from "@/components/member/PlanBadgeVisual";
import { formatPhp, formatDateManila, daysRemainingUntil } from "@/lib/format";
import {
  packageStatusLabel,
  type ActivatedPackage,
  type MemberPackagesPayload,
} from "@/lib/member-packages";
import { themeForPlan } from "@/lib/plan-themes";

function StatusPill({ status }: { status: ActivatedPackage["status"] }) {
  const styles =
    status === "active"
      ? "border-emerald-400/50 bg-emerald-950/50 text-emerald-200"
      : status === "expired"
        ? "border-slate-500/40 bg-slate-900/50 text-slate-400"
        : "border-amber-400/40 bg-amber-950/40 text-amber-200";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles}`}
    >
      {packageStatusLabel(status)}
    </span>
  );
}

function PackageCard({ pkg }: { pkg: ActivatedPackage }) {
  const theme = themeForPlan(pkg.slug);
  const daysLeft = daysRemainingUntil(pkg.subscriptionEndsAt);

  return (
    <GlassPanel glow={theme.glow} className="overflow-hidden p-0">
      <div className="flex gap-3 p-3">
        <div className="w-[88px] shrink-0">
          <PlanBadgeVisual planSlug={pkg.slug} variant="dialog" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-white">{pkg.name}</h3>
            <StatusPill status={pkg.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-sky-100/65">
            Activated {formatDateManila(pkg.purchasedAt)}
            {pkg.pricePhp > 0 && ` · ${formatPhp(pkg.pricePhp)}`}
          </p>
          {pkg.status === "active" && pkg.subscriptionEndsAt && (
            <p className="mt-1 text-xs text-cyan-200/80">
              Membership · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </p>
          )}
          {pkg.dramaBundleDays > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-sky-200/70">
              <Film className="h-3 w-3" />+{pkg.dramaBundleDays} video days on
              activation
            </p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
              <p className="text-[9px] uppercase text-sky-200/60">Earned*</p>
              <p className="text-sm font-bold text-white">
                {formatPhp(pkg.earnedInPeriod)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
              <p className="text-[9px] uppercase text-sky-200/60">Potential*</p>
              <p className="text-sm font-bold text-amber-200">
                {formatPhp(pkg.totalPotential)}
              </p>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Up to {formatPhp(pkg.dailyPotential)}/day · {pkg.episodesPerDay}{" "}
            episodes/day
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}

export function PackagesView() {
  const [data, setData] = useState<MemberPackagesPayload | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader variant="profile" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/profile"
            className="rounded-full border border-sky-700 p-2 text-sky-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              <Crown className="h-5 w-5 text-amber-400" />
              My Packages
            </h1>
            <p className="text-xs text-sky-200/70">
              Activated plans & earnings
            </p>
          </div>
          <Link
            href="/task"
            className="flex items-center gap-1 rounded-full border border-sky-600/60 bg-sky-950/50 px-3 py-1.5 text-xs font-semibold text-sky-200"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Tasks
          </Link>
        </div>

        {loading && (
          <p className="text-center text-sm text-slate-500">Loading…</p>
        )}

        {data && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <GlassPanel className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300/80">
                Total potential earnings*
              </p>
              <p className="mt-1 text-3xl font-black text-amber-200">
                {formatPhp(data.totalPotentialDisplay)}
              </p>
              <p className="mt-1 text-xs text-sky-100/70">
                Display projection for your current plan term if daily tasks are
                completed on the{" "}
                <Link href="/task" className="text-sky-300 underline">
                  Tasks
                </Link>{" "}
                tab.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2">
                  <Wallet className="h-4 w-4 text-emerald-300" />
                  <div>
                    <p className="text-[9px] uppercase text-emerald-200/70">
                      Earned (active)
                    </p>
                    <p className="text-sm font-bold text-white">
                      {formatPhp(data.totalEarnedActivePeriod)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-950/30 px-3 py-2">
                  <TrendingUp className="h-4 w-4 text-violet-300" />
                  <div>
                    <p className="text-[9px] uppercase text-violet-200/70">
                      Earned (all time)
                    </p>
                    <p className="text-sm font-bold text-white">
                      {formatPhp(data.totalEarnedAllTime)}
                    </p>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-sky-200/90">
                Activated packages
              </h2>
              {data.packages.length === 0 ? (
                <GlassCard className="p-4 text-center text-sm text-slate-400">
                  No paid packages yet.{" "}
                  <Link href="/subscriptions" className="text-sky-300 underline">
                    Browse plans
                  </Link>
                </GlassCard>
              ) : (
                <ul className="space-y-3">
                  {data.packages.map((pkg) => (
                    <li key={`${pkg.slug}-${pkg.purchasedAt}`}>
                      <PackageCard pkg={pkg} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-center text-[10px] text-slate-500">
              *Displayed projections, not guaranteed earnings.
            </p>

            <Link
              href="/subscriptions"
              className="block rounded-full bg-gradient-to-r from-sky-400 to-blue-600 py-3 text-center text-sm font-bold text-white shadow-[0_0_20px_rgba(0,150,255,0.4)]"
            >
              Upgrade or browse plans
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
