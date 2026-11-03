export type PlanTheme = {
  accent: string;
  glow: string;
  heroBorder: string;
  badgeGradient: string;
  /** Interactive 3D badge (GLB exported from Blender). */
  modelSrc: string;
};

function modelSrc(slug: string) {
  return `/assets/plans/3d/${slug}.glb`;
}

export const PLAN_THEMES: Record<string, PlanTheme> = {
  trial: {
    accent: "#2dd4bf",
    glow: "rgba(45, 212, 191, 0.45)",
    heroBorder: "rgba(45, 212, 191, 0.55)",
    badgeGradient: "from-teal-600 to-cyan-900",
    modelSrc: modelSrc("trial"),
  },
  elite: {
    accent: "#38bdf8",
    glow: "rgba(56, 189, 248, 0.5)",
    heroBorder: "rgba(56, 189, 248, 0.6)",
    badgeGradient: "from-sky-500 to-blue-900",
    modelSrc: modelSrc("elite"),
  },
  elite_pro: {
    accent: "#4ade80",
    glow: "rgba(74, 222, 128, 0.45)",
    heroBorder: "rgba(74, 222, 128, 0.55)",
    badgeGradient: "from-emerald-500 to-green-900",
    modelSrc: modelSrc("elite_pro"),
  },
  premium: {
    accent: "#fb923c",
    glow: "rgba(251, 146, 60, 0.45)",
    heroBorder: "rgba(251, 146, 60, 0.55)",
    badgeGradient: "from-orange-500 to-amber-900",
    modelSrc: modelSrc("premium"),
  },
  premium_elite: {
    accent: "#f87171",
    glow: "rgba(248, 113, 113, 0.45)",
    heroBorder: "rgba(248, 113, 113, 0.55)",
    badgeGradient: "from-red-500 to-rose-900",
    modelSrc: modelSrc("premium_elite"),
  },
  executive: {
    accent: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.45)",
    heroBorder: "rgba(167, 139, 250, 0.55)",
    badgeGradient: "from-violet-500 to-purple-900",
    modelSrc: modelSrc("executive"),
  },
  executive_pro: {
    accent: "#67e8f9",
    glow: "rgba(103, 232, 249, 0.45)",
    heroBorder: "rgba(103, 232, 249, 0.55)",
    badgeGradient: "from-cyan-400 to-sky-900",
    modelSrc: modelSrc("executive_pro"),
  },
  prestige: {
    accent: "#22d3ee",
    glow: "rgba(34, 211, 238, 0.45)",
    heroBorder: "rgba(34, 211, 238, 0.55)",
    badgeGradient: "from-cyan-500 to-teal-900",
    modelSrc: modelSrc("prestige"),
  },
  prestige_elite: {
    accent: "#e879f9",
    glow: "rgba(232, 121, 249, 0.45)",
    heroBorder: "rgba(232, 121, 249, 0.55)",
    badgeGradient: "from-fuchsia-500 to-purple-900",
    modelSrc: modelSrc("prestige_elite"),
  },
  professional: {
    accent: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.5)",
    heroBorder: "rgba(251, 191, 36, 0.6)",
    badgeGradient: "from-amber-400 to-yellow-900",
    modelSrc: modelSrc("professional"),
  },
};

export function themeForPlan(slug: string): PlanTheme {
  return PLAN_THEMES[slug] ?? PLAN_THEMES.elite;
}
