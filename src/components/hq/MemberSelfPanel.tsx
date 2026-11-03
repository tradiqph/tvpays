import Link from "next/link";
import { Clapperboard, Crown, Smartphone, Wallet } from "lucide-react";
import { Card } from "@/components/hq/ui";

const links = [
  {
    href: "/wallet",
    label: "Wallet",
    sub: "Top up, move between deposit & withdrawal, cash out",
    icon: Wallet,
  },
  {
    href: "/media",
    label: "Drama shorts",
    sub: "Watch episodes and earn like any member",
    icon: Clapperboard,
  },
  {
    href: "/packages",
    label: "My packages",
    sub: "Plans, tasks, and daily episode progress",
    icon: Crown,
  },
  {
    href: "/profile",
    label: "Profile",
    sub: "Account, list, referrals, and settings",
    icon: Smartphone,
  },
] as const;

/** Shown on HQ when viewing your own member record — same app as everyone else. */
export function MemberSelfPanel() {
  return (
    <Card title="Your member app">
      <p className="mb-4 text-sm text-slate-400">
        Staff accounts use the same member experience: wallet transfers, dramas,
        subscriptions, and profile tools. HQ admin actions above are optional;
        day-to-day use the member app.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition hover:border-sky-400/30 hover:bg-sky-500/5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                  {item.sub}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
