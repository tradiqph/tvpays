"use client";

import dynamic from "next/dynamic";
import { themeForPlan } from "@/lib/plan-themes";

const PlanBadge3D = dynamic(
  () => import("./PlanBadge3D").then((m) => m.PlanBadge3D),
  {
    ssr: false,
    loading: () => <div className="h-full w-full min-h-[8rem]" />,
  },
);

type Props = {
  planSlug: string;
  /** Carousel hero vs compact confirm dialog. */
  variant?: "hero" | "dialog";
  className?: string;
};

export function PlanBadgeVisual({
  planSlug,
  variant = "hero",
  className,
}: Props) {
  const theme = themeForPlan(planSlug);
  const modelSrc = theme.modelSrc ?? `/assets/plans/3d/${planSlug}.glb`;
  const sizeClass =
    variant === "dialog"
      ? "mx-auto aspect-square h-44 w-44 shrink-0"
      : "mx-auto h-64 w-full max-w-[280px]";

  return (
    <div
      className={`flex items-center justify-center ${variant === "dialog" ? "h-full w-full" : ""} ${className ?? ""}`}
    >
      <PlanBadge3D
        modelSrc={modelSrc}
        glow={theme.glow}
        className={sizeClass}
        variant={variant}
      />
    </div>
  );
}
