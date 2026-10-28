"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlanSlug } from "@/lib/plans";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Play,
  Coins,
  TrendingUp,
  Wallet,
  Award,
  CalendarDays,
} from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { GlassCard } from "@/components/member/GlassCard";
import { GlassPanel } from "@/components/member/GlassPanel";
import { StatTile } from "@/components/member/StatTile";
import { PlanBadgeHero } from "@/components/member/PlanBadgeHero";
import { ConfirmPlanDialog } from "@/components/member/ConfirmPlanDialog";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "@/lib/plans";
import { formatPhp } from "@/lib/format";
import { themeForPlan } from "@/lib/plan-themes";

type StatRow = {
  key: string;
  label: (p: SubscriptionPlan) => string;
  icon: typeof Play;
  accent: "blue" | "gold" | "purple";
  get: (p: SubscriptionPlan) => string;
  /** Only show the row for plans matching this predicate. */
  showFor?: (p: SubscriptionPlan) => boolean;
};

const isFree = (p: SubscriptionPlan) => p.pricePhp === 0;

const statRows: StatRow[] = [
  {
    key: "ads",
    label: () => "Episodes Daily",
    icon: Play,
    accent: "blue",
    get: (p) => String(p.adsPerDay),
  },
  {
    key: "duration",
    label: () => "Duration",
    icon: CalendarDays,
    accent: "gold",
    get: (p) => `${p.durationDays} Days`,
    showFor: isFree,
  },
  {
    key: "price",
    label: () => "Package Price",
    icon: Coins,
    accent: "gold",
    get: (p) => formatPhp(p.pricePhp),
  },
  {
    key: "daily",
    label: () => "Daily Income*",
    icon: TrendingUp,
    accent: "blue",
    get: (p) => formatPhp(p.dailyIncomeDisplay),
  },
  {
    key: "total",
    label: (p) => `Total Revenue (${p.durationDays} Days)*`,
    icon: Wallet,
    accent: "purple",
    get: (p) => formatPhp(p.totalRevenueDisplay),
  },
];

export function SubscriptionsView() {
  // Free Trial (sortOrder 0) leads the carousel, then the paid tiers.
  const plans = [...SUBSCRIPTION_PLANS].sort((a, b) => a.sortOrder - b.sortOrder);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const plan = plans[index];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [activePlanSlug, setActivePlanSlug] = useState<PlanSlug | null>(null);
  const [purchasedSlugs, setPurchasedSlugs] = useState<Set<PlanSlug>>(
    () => new Set(),
  );
  const snappedToActive = useRef(false);

  const isCurrentPlan =
    !isFree(plan) && activePlanSlug !== null && activePlanSlug === plan.slug;

  /** Bought this tier before, but membership tier moved on (e.g. upgraded to Premium). */
  const isPreviousTier =
    !isFree(plan) &&
    !isCurrentPlan &&
    activePlanSlug !== null &&
    purchasedSlugs.has(plan.slug);

  const activePlanName =
    activePlanSlug != null
      ? (plans.find((p) => p.slug === activePlanSlug)?.name ?? activePlanSlug)
      : null;

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/member/packages");
      if (!res.ok) return;
      const json = (await res.json()) as {
        activePlanSlug: PlanSlug | null;
        packages: { slug: PlanSlug; pricePhp: number }[];
      };
      const slugs = new Set<PlanSlug>();
      for (const pkg of json.packages ?? []) {
        if (pkg.pricePhp > 0) slugs.add(pkg.slug);
      }
      setPurchasedSlugs(slugs);
      if (json.activePlanSlug) {
        setActivePlanSlug(json.activePlanSlug);
      } else {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("plan_slug, subscription_ends_at")
          .eq("id", user.id)
          .single();
        if (
          data?.plan_slug &&
          data.plan_slug !== "trial" &&
          data.subscription_ends_at &&
          new Date(data.subscription_ends_at).getTime() > Date.now()
        ) {
          setActivePlanSlug(data.plan_slug as PlanSlug);
        } else {
          setActivePlanSlug(null);
        }
      }
    })();
  }, [purchased]);

  useEffect(() => {
    if (snappedToActive.current || !activePlanSlug) return;
    const idx = plans.findIndex((p) => p.slug === activePlanSlug);
    if (idx >= 0) {
      setIndex(idx);
      snappedToActive.current = true;
    }
  }, [activePlanSlug, plans]);

  function go(next: number) {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  }

  function openConfirm() {
    if (isCurrentPlan || isPreviousTier) return;
    setError(null);
    setPurchased(false);
    setConfirmOpen(true);
  }

  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    setError(null);
  }, []);

  async function choosePlan() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/economy/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: plan.slug }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) setError(json.error ?? "Could not purchase plan");
      else {
        setPurchased(true);
        setActivePlanSlug(plan.slug);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader />
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        {activePlanName && (
          <p className="mb-2 rounded-xl border border-emerald-400/35 bg-emerald-950/40 px-3 py-2 text-center text-xs text-emerald-100/90">
            Your membership tier:{" "}
            <span className="font-bold text-emerald-200">{activePlanName}</span>
            {isPreviousTier && plan.slug !== activePlanSlug && (
              <span className="mt-1 block text-[10px] text-sky-200/70">
                This plan is in My Packages as a previous activation, not your
                current tier.
              </span>
            )}
          </p>
        )}
        {!activePlanSlug && (
          <p className="mb-2 rounded-xl border border-amber-400/35 bg-amber-950/35 px-3 py-2 text-center text-xs text-amber-100/90">
            Withdrawals to GCash, Maya, or bank are unlocked only with an{" "}
            <span className="font-semibold text-amber-200">active paid plan</span>
            . Choose a tier below to subscribe.
          </p>
        )}
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => go(Math.max(0, index - 1))}
            disabled={index === 0}
            className="rounded-full border border-sky-700 p-2 text-sky-300 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <div className="text-center">
              <p className="text-sm font-bold tracking-wide text-white">
                {plan.name.toUpperCase()}
              </p>
              <p className="text-[9px] uppercase tracking-widest text-sky-400/80">
                Media Platform
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => go(Math.min(plans.length - 1, index + 1))}
            disabled={index === plans.length - 1}
            className="rounded-full border border-sky-700 p-2 text-sky-300 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex justify-center gap-1.5">
          {plans.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-4 bg-sky-400 shadow-[0_0_8px_rgba(0,180,255,0.8)]"
                  : "w-1.5 bg-slate-600"
              }`}
              aria-label={`Plan ${p.name}`}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={plan.slug}
              custom={direction}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60 && index < plans.length - 1) {
                  go(index + 1);
                } else if (info.offset.x > 60 && index > 0) {
                  go(index - 1);
                }
              }}
              initial={{ opacity: 0, x: direction >= 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -40 : 40 }}
              transition={{ duration: 0.25 }}
            >
              <GlassPanel glow={themeForPlan(plan.slug).glow}>
              <PlanBadgeHero
                planSlug={plan.slug}
                tierNumber={plan.tierNumber}
                planName={plan.name}
              />
              <ul className="space-y-2">
                {statRows
                  .filter((row) => !row.showFor || row.showFor(plan))
                  .map((row, i) => {
                  const Icon = row.icon;
                  return (
                    <motion.li
                      key={row.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {row.key === "ads" || row.key === "price" || row.key === "duration" ? (
                        <StatTile
                          icon={Icon}
                          label={row.label(plan)}
                          value={row.get(plan)}
                          variant={row.accent}
                        />
                      ) : (
                      <GlassCard
                        accent={row.accent}
                        className="flex items-center gap-3 px-3 py-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/35 ring-1 ring-white/10">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="flex-1 text-sm text-slate-300">
                          {row.label(plan)}
                        </span>
                        <span className="font-bold text-white">
                          {row.get(plan)}
                        </span>
                      </GlassCard>
                      )}
                    </motion.li>
                  );
                })}
                {!isFree(plan) && plan.dramaBundleDays > 0 && (
                  <motion.li
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <GlassCard className="px-3 py-3 text-sm text-slate-300">
                      Includes{" "}
                      <span className="font-bold text-white">
                        +{plan.dramaBundleDays} days
                      </span>{" "}
                      unlimited drama access (stacks on upgrade).
                    </GlassCard>
                  </motion.li>
                )}
              </ul>
              </GlassPanel>
              <p className="mt-2 text-center text-[10px] text-slate-500">
                *Displayed projections, not guaranteed earnings.
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          disabled={loading || isFree(plan) || isCurrentPlan || isPreviousTier}
          onClick={openConfirm}
          whileTap={
            isCurrentPlan || isPreviousTier ? undefined : { scale: 0.98 }
          }
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold uppercase tracking-wide text-white disabled:opacity-60 ${
            isCurrentPlan
              ? "border border-emerald-400/40 bg-emerald-950/50 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.25)]"
              : isPreviousTier
                ? "border border-amber-400/35 bg-amber-950/45 text-amber-100"
                : "bg-gradient-to-r from-sky-400 to-blue-600 shadow-[0_0_24px_rgba(0,150,255,0.45)]"
          }`}
        >
          {isFree(plan)
            ? "Free on sign-up"
            : isCurrentPlan
              ? "Active"
              : isPreviousTier
                ? "Previous plan"
                : loading
                  ? "Processing…"
                  : "Choose Plan"}
          {!isCurrentPlan && !isPreviousTier && !isFree(plan) && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </motion.button>
        {isCurrentPlan && (
          <p className="mt-1.5 text-center text-[10px] text-slate-500">
            Active — cannot be extended. Swipe to another tier to upgrade.
          </p>
        )}
        {isPreviousTier && activePlanName && (
          <p className="mt-1.5 text-center text-[10px] text-slate-500">
            Already activated once. Current tier: {activePlanName}. Swipe to a
            higher plan to upgrade.
          </p>
        )}
      </div>

      <ConfirmPlanDialog
        open={confirmOpen}
        plan={plan}
        loading={loading}
        error={error}
        success={purchased}
        onConfirm={choosePlan}
        onClose={closeConfirm}
      />
    </div>
  );
}
