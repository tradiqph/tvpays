"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  BadgeCheck,
  Banknote,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  ScrollText,
  ShieldCheck,
  UserCircle,
  Users,
  X,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/branding";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  superOnly?: boolean;
};

type Props = {
  children: ReactNode;
  email: string;
  role: "hq" | "super_admin";
  userId: string;
  pendingWithdrawals: number;
  pendingAgents: number;
};

function NavLink({
  item,
  pathname,
  compact = false,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`relative flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
      } ${compact ? "py-3" : "py-2"}`}
    >
      {active && (
        <motion.span
          layoutId={compact ? "hq-more-active" : "hq-nav-active"}
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500/25 to-sky-500/5 ring-1 ring-sky-400/30"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className={`relative h-[18px] w-[18px] ${active ? "text-sky-300" : ""}`} />
      <span className="relative flex-1">{item.label}</span>
      {!!item.badge && (
        <span className="relative rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-amber-950 tabular-nums">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/hq" ? pathname === "/hq" : pathname === href || pathname.startsWith(`${href}/`);
}

export function HqShell({
  children,
  email,
  role,
  userId,
  pendingWithdrawals,
  pendingAgents,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const isSuper = role === "super_admin";

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "Overview",
      items: [{ href: "/hq", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Operations",
      items: [
        { href: "/hq/withdrawals", label: "Withdrawals", icon: Banknote, badge: pendingWithdrawals },
        { href: "/hq/deposits", label: "Deposits", icon: ArrowDownToLine },
        { href: "/hq/agents", label: "Agents", icon: BadgeCheck, badge: pendingAgents },
      ],
    },
    {
      title: "People & money",
      items: [
        { href: "/hq/members", label: "Members", icon: Users },
        {
          href: `/hq/members/${userId}`,
          label: "My account",
          icon: UserCircle,
        },
        { href: "/hq/transactions", label: "Transactions", icon: ArrowLeftRight },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/hq/system", label: "System status", icon: Activity },
        { href: "/hq/team", label: "Admin team", icon: ShieldCheck, superOnly: true },
        { href: "/hq/audit", label: "Audit log", icon: ScrollText, superOnly: true },
      ],
    },
  ];
  const visible = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.superOnly || isSuper) }))
    .filter((g) => g.items.length);

  const bottom: NavItem[] = [
    { href: "/hq", label: "Home", icon: LayoutDashboard },
    { href: "/hq/withdrawals", label: "Payouts", icon: Banknote, badge: pendingWithdrawals },
    { href: "/hq/members", label: "Members", icon: Users },
    { href: "/hq/deposits", label: "Deposits", icon: ArrowDownToLine },
  ];
  const bottomHrefs = new Set(bottom.map((b) => b.href));
  const moreActive = !bottom.some((b) => isActive(pathname, b.href));

  // iOS Safari ignores user-scalable=no; block pinch gestures explicitly.
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop);
    return () => document.removeEventListener("gesturestart", stop);
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const userBlock = (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-sky-400 to-blue-700 text-sm font-bold text-white">
        {email.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-200">{email}</p>
        <p className={`text-[11px] font-semibold ${isSuper ? "text-violet-300" : "text-sky-300"}`}>
          {isSuper ? "Super admin" : "HQ staff"}
        </p>
      </div>
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-rose-300"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 flex justify-center bg-[#01040c] md:static md:block md:min-h-screen">
      <div
        className="relative flex h-[100dvh] w-[min(100vw,calc(100dvh*9/16))] flex-col overflow-hidden bg-[#030a1a] text-slate-100 md:h-auto md:min-h-screen md:w-full md:flex-row md:overflow-visible"
        style={{ touchAction: "pan-x pan-y" }}
      >
        {/* Ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.16),transparent_70%)] md:fixed"
        />

        {/* Desktop sidebar */}
        <aside className="relative hidden w-64 shrink-0 md:block">
          <div className="sticky top-0 flex h-screen flex-col border-r border-white/[0.06] bg-[#050e22]/80 px-3 py-5 backdrop-blur">
            <Link href="/hq" className="mb-6 flex items-center gap-2.5 px-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
              <img src={BRAND.mark} alt="" className="h-9 w-9 object-contain" />
              <span>
                <span className="block text-sm font-extrabold tracking-wide text-white">TvPays HQ</span>
                <span className="block text-[11px] text-slate-500">Admin console</span>
              </span>
            </Link>
            <nav className="flex-1 space-y-5 overflow-y-auto">
              {visible.map((g) => (
                <div key={g.title}>
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                    {g.title}
                  </p>
                  <div className="space-y-0.5">
                    {g.items.map((item) => (
                      <NavLink key={item.href} item={item} pathname={pathname} />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <Link
              href="/wallet"
              className="mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-sky-300/90 hover:bg-white/[0.04] hover:text-sky-200"
            >
              <MonitorSmartphone className="h-4 w-4" />
              Member app (wallet & dramas)
            </Link>
            <Link
              href={`/hq/members/${userId}`}
              className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-slate-200"
            >
              <UserCircle className="h-4 w-4" />
              My HQ member record
            </Link>
            {userBlock}
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="relative z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#050e22]/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/hq" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img src={BRAND.mark} alt="" className="h-7 w-7 object-contain" />
            <span className="text-sm font-extrabold text-white">TvPays HQ</span>
          </Link>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
              isSuper ? "text-violet-300 ring-violet-400/40" : "text-sky-300 ring-sky-400/40"
            }`}
          >
            {isSuper ? "SUPER ADMIN" : "HQ"}
          </span>
        </header>

        <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:overflow-visible md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="relative z-10 grid grid-cols-5 border-t border-white/[0.06] bg-[#050e22]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {[...bottom, { href: "#more", label: "More", icon: Menu }].map((item) => {
            const isMore = item.href === "#more";
            const active = isMore ? moreActive || moreOpen : isActive(pathname, item.href);
            const Icon = item.icon;
            const cls = `relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium ${
              active ? "text-sky-300" : "text-slate-500"
            }`;
            const content = (
              <>
                {active && (
                  <motion.span
                    layoutId="hq-tab"
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                  />
                )}
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {!!(item as NavItem).badge && (
                    <span className="absolute -right-2 -top-1 rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950">
                      {(item as NavItem).badge}
                    </span>
                  )}
                </span>
                {item.label}
              </>
            );
            return isMore ? (
              <button key={item.href} type="button" onClick={() => setMoreOpen(true)} className={cls}>
                {content}
              </button>
            ) : (
              <Link key={item.href} href={item.href} className={cls}>
                {content}
              </Link>
            );
          })}
        </nav>

        {/* Mobile "More" sheet */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              className="absolute inset-0 z-40 flex items-end md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 bg-black/70"
                onClick={() => setMoreOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 320 }}
                className="relative max-h-[80%] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#071331] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">Menu</p>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close"
                    className="rounded-full bg-white/5 p-1.5 text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-0.5">
                  {visible
                    .flatMap((g) => g.items)
                    .filter((i) => !bottomHrefs.has(i.href))
                    .map((item) => (
                      <NavLink key={item.href} item={item} pathname={pathname} compact onNavigate={() => setMoreOpen(false)} />
                    ))}
                  <Link
                    href="/wallet"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-sky-300"
                  >
                    <MonitorSmartphone className="h-[18px] w-[18px]" />
                    Member app (wallet & dramas)
                  </Link>
                  <Link
                    href={`/hq/members/${userId}`}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400"
                  >
                    <UserCircle className="h-[18px] w-[18px]" />
                    My HQ member record
                  </Link>
                </div>
                <div className="mt-3">{userBlock}</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
