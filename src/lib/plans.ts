export type PlanSlug =
  | "trial"
  | "basic"
  | "elite"
  | "elite_pro"
  | "premium"
  | "premium_elite"
  | "executive"
  | "executive_pro"
  | "prestige"
  | "prestige_elite"
  | "professional";

export type { PlanTheme } from "./plan-themes";
export { PLAN_THEMES, themeForPlan } from "./plan-themes";

export type SubscriptionPlan = {
  slug: PlanSlug;
  name: string;
  pricePhp: number;
  /** Daily cap on paying episode completions (Manila). */
  adsPerDay: number;
  /** Alias for member-facing copy. */
  episodesPerDay: number;
  dailyIncomeDisplay: number;
  /** Display projection: roughly dailyIncomeDisplay × durationDays — not guaranteed earnings. */
  totalRevenueDisplay: number;
  durationDays: number;
  /** Stackable drama access days granted on purchase. */
  dramaBundleDays: number;
  sortOrder: number;
  tierNumber: number | null;
};

/** Display projections from the TvPays guide — not guaranteed earnings. */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    slug: "trial",
    name: "Free Trial",
    pricePhp: 0,
    adsPerDay: 2,
    episodesPerDay: 2,
    dailyIncomeDisplay: 6,
    totalRevenueDisplay: 90,
    durationDays: 15,
    dramaBundleDays: 0,
    sortOrder: 0,
    tierNumber: null,
  },
  {
    slug: "basic",
    name: "Basic",
    pricePhp: 999,
    adsPerDay: 3,
    episodesPerDay: 3,
    dailyIncomeDisplay: 34,
    totalRevenueDisplay: 2040,
    durationDays: 60,
    dramaBundleDays: 3,
    sortOrder: 1,
    tierNumber: 1,
  },
  {
    slug: "elite",
    name: "Elite",
    pricePhp: 2500,
    adsPerDay: 4,
    episodesPerDay: 4,
    dailyIncomeDisplay: 45.5,
    totalRevenueDisplay: 16380,
    durationDays: 360,
    dramaBundleDays: 7,
    sortOrder: 2,
    tierNumber: 2,
  },
  {
    slug: "elite_pro",
    name: "Elite Pro",
    pricePhp: 4850,
    adsPerDay: 8,
    episodesPerDay: 8,
    dailyIncomeDisplay: 88.2,
    totalRevenueDisplay: 31752,
    durationDays: 360,
    dramaBundleDays: 14,
    sortOrder: 3,
    tierNumber: 3,
  },
  {
    slug: "premium",
    name: "Premium",
    pricePhp: 8950,
    adsPerDay: 15,
    episodesPerDay: 15,
    dailyIncomeDisplay: 162.8,
    totalRevenueDisplay: 58608,
    durationDays: 360,
    dramaBundleDays: 21,
    sortOrder: 4,
    tierNumber: 4,
  },
  {
    slug: "premium_elite",
    name: "Premium Elite",
    pricePhp: 13500,
    adsPerDay: 22,
    episodesPerDay: 22,
    dailyIncomeDisplay: 245.5,
    totalRevenueDisplay: 88380,
    durationDays: 360,
    dramaBundleDays: 30,
    sortOrder: 5,
    tierNumber: 5,
  },
  {
    slug: "executive",
    name: "Executive",
    pricePhp: 22800,
    adsPerDay: 30,
    episodesPerDay: 30,
    dailyIncomeDisplay: 414.6,
    totalRevenueDisplay: 149256,
    durationDays: 360,
    dramaBundleDays: 60,
    sortOrder: 6,
    tierNumber: 6,
  },
  {
    slug: "executive_pro",
    name: "Executive Pro",
    pricePhp: 38500,
    adsPerDay: 40,
    episodesPerDay: 40,
    dailyIncomeDisplay: 700,
    totalRevenueDisplay: 252000,
    durationDays: 360,
    dramaBundleDays: 120,
    sortOrder: 7,
    tierNumber: 7,
  },
  {
    slug: "prestige",
    name: "Prestige",
    pricePhp: 57900,
    adsPerDay: 50,
    episodesPerDay: 50,
    dailyIncomeDisplay: 1053,
    totalRevenueDisplay: 379080,
    durationDays: 360,
    dramaBundleDays: 180,
    sortOrder: 8,
    tierNumber: 8,
  },
  {
    slug: "prestige_elite",
    name: "Prestige Elite",
    pricePhp: 86500,
    adsPerDay: 60,
    episodesPerDay: 60,
    dailyIncomeDisplay: 1573,
    totalRevenueDisplay: 566280,
    durationDays: 360,
    dramaBundleDays: 240,
    sortOrder: 9,
    tierNumber: 9,
  },
  {
    slug: "professional",
    name: "Professional",
    pricePhp: 125000,
    adsPerDay: 70,
    episodesPerDay: 70,
    dailyIncomeDisplay: 2272.75,
    totalRevenueDisplay: 818190,
    durationDays: 360,
    dramaBundleDays: 365,
    sortOrder: 10,
    tierNumber: 10,
  },
];

export const MIN_TOPUP_PHP = 500;
export const MIN_WITHDRAWAL_PHP = 200;
/** Single request cap (balance check still applies). */
export const MAX_WITHDRAWAL_PHP = 100_000;
export const MAX_TOPUP_PHP = 100_000;
export const WITHDRAWAL_TAX_RATE = 0.03;
export const DAILY_CHECKIN_PHP = 5;
export const REFERRAL_RATES = { a: 0.05, b: 0.03, c: 0.01 } as const;
export const REFERRAL_LEVELS = [
  { key: "L1" as const, rate: REFERRAL_RATES.a },
  { key: "L2" as const, rate: REFERRAL_RATES.b },
  { key: "L3" as const, rate: REFERRAL_RATES.c },
] as const;
export function planBySlug(slug: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.slug === slug);
}

export function paidPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter((p) => p.pricePhp > 0);
}

export function adRewardPerView(plan: SubscriptionPlan): number {
  if (plan.adsPerDay <= 0) return 0;
  return (
    Math.round((plan.dailyIncomeDisplay / plan.adsPerDay) * 100) / 100
  );
}

/** Higher sortOrder = higher tier (trial = 0). */
export function planTierRank(slug: PlanSlug): number {
  const plan = planBySlug(slug);
  return plan?.sortOrder ?? 0;
}

export function isPaidPlanSlug(slug: PlanSlug): boolean {
  const plan = planBySlug(slug);
  return !!plan && plan.pricePhp > 0 && slug !== "trial";
}

/**
 * Amount to debit when moving from `fromSlug` to `toSlug`.
 * Trial → paid: full list price. Paid upgrade: price difference only.
 */
export function upgradeChargePhp(
  fromSlug: PlanSlug,
  toSlug: PlanSlug,
): number {
  const to = planBySlug(toSlug);
  const from = planBySlug(fromSlug);
  if (!to || to.pricePhp <= 0 || toSlug === "trial") {
    throw new Error("invalid_plan");
  }
  if (fromSlug === toSlug) {
    throw new Error("plan_already_active");
  }
  const fromRank = planTierRank(fromSlug);
  const toRank = planTierRank(toSlug);
  if (toRank <= fromRank) {
    throw new Error("upgrade_not_higher");
  }
  if (!from || fromSlug === "trial" || !isPaidPlanSlug(fromSlug)) {
    return to.pricePhp;
  }
  return to.pricePhp - from.pricePhp;
}
