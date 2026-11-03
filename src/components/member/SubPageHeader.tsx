"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Top bar for pages opened from the profile menu. */
export function SubPageHeader({
  title,
  back = "/profile",
}: {
  title: string;
  back?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 pb-3 pt-4">
      <Link
        href={back}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-300/50 bg-gradient-to-b from-[#1b4fc4] to-[#0a2263] text-white"
        style={{
          boxShadow: "0 0 10px rgba(56,150,255,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-lg font-extrabold text-white">{title}</h1>
    </div>
  );
}
