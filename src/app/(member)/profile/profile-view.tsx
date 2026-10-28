"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MemberHeader } from "@/components/member/MemberHeader";
import { AvatarPicker } from "@/components/member/AvatarPicker";
import { GlossIcon, GlossPanel, TONES, type Tone } from "@/components/member/ProfileGloss";
import { createClient } from "@/lib/supabase/client";
import { planBySlug } from "@/lib/plans";
import { daysRemainingUntil, formatDateManila } from "@/lib/format";
import {
  ChevronRight,
  User,
  Crown,
  Wallet,
  Banknote,
  Users,
  Shield,
  Headphones,
  Settings,
  LogOut,
  Star,
  Trophy,
  Copy,
  Check,
  Pencil,
  Film,
} from "lucide-react";

type Profile = {
  member_code: string;
  display_name: string | null;
  avatar_url: string | null;
  plan_slug: string;
  ads_points: number;
  agent_status: string;
  referral_code: string;
  xp: number;
  level: number;
  drama_access_ends_at: string | null;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
};

const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0 },
};

export function ProfileView() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [referrals, setReferrals] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select(
        "member_code, display_name, avatar_url, plan_slug, ads_points, agent_status, referral_code, xp, level, drama_access_ends_at, subscription_ends_at, trial_ends_at",
      )
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as Profile);

    const { count: refCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("referred_by", user.id);
    setReferrals(refCount ?? 0);

    const { count: episodeCount } = await supabase
      .from("drama_episode_completions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    setTasksDone(episodeCount ?? 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function applyAgent() {
    await fetch("/api/agent/apply", { method: "POST" });
    load();
  }

  const plan = planBySlug(profile?.plan_slug ?? "trial");
  const isAgent = profile?.agent_status === "approved";
  const badge = isAgent ? "Agent" : "VIP Member";
  const xp = profile?.xp ?? 0;
  const videoAccessDays = daysRemainingUntil(profile?.drama_access_ends_at);
  const videoAccessActive = videoAccessDays > 0;
  const trialDaysLeft = daysRemainingUntil(profile?.trial_ends_at);
  const trialStreamingActive =
    profile?.plan_slug === "trial" && trialDaysLeft > 0 && !videoAccessActive;
  const membershipDaysLeft = daysRemainingUntil(profile?.subscription_ends_at);

  async function copyCode() {
    if (!profile?.member_code) return;
    await navigator.clipboard.writeText(profile.member_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const menu: {
    icon: typeof User;
    tone: Tone;
    title: string;
    sub: string;
    href?: string;
  }[] = [
    { icon: User, tone: "blue", title: "Account Information", sub: "View and manage your account details", href: "/profile/account" },
    { icon: Crown, tone: "gold", title: "My Packages", sub: "Activated plans & earnings", href: "/packages" },
    { icon: Wallet, tone: "purple", title: "My Earnings", sub: "Income history and rewards", href: "/wallet" },
    { icon: Banknote, tone: "green", title: "Withdrawals", sub: "Withdraw to your bank or e-wallet", href: "/wallet" },
    {
      icon: Users,
      tone: "magenta",
      title: "My Referrals",
      sub: "View your team and referral earnings",
      href: "/profile/referrals",
    },
    { icon: Shield, tone: "blue", title: "Security", sub: "Change password and security settings", href: "/profile/security" },
    { icon: Headphones, tone: "slate", title: "Help & Support", sub: "FAQs and contact support", href: "/profile/help" },
    { icon: Settings, tone: "blue", title: "Settings", sub: "App preferences and notifications", href: "/profile/settings" },
  ];

  const statTiles: { label: string; value: number; icon: typeof User; tone: Tone }[] = [
    { label: "My Referrals", value: referrals, icon: Users, tone: "blue" },
    { label: "Ads Points", value: profile?.ads_points ?? 0, icon: Star, tone: "gold" },
    { label: "Completed Tasks", value: tasksDone, icon: Trophy, tone: "gold" },
  ];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader variant="profile" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {/* Profile card */}
        <div
          className="relative mb-3 overflow-hidden rounded-2xl border-2 border-sky-300/70 bg-gradient-to-br from-[#1652d6] via-[#0c3192] to-[#06174d] p-3"
          style={{
            boxShadow:
              "0 0 24px rgba(40,130,255,0.5), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -10px 24px rgba(0,0,0,0.25)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
          <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-24 rotate-[35deg] bg-gradient-to-b from-white/20 to-transparent blur-md" />

          <div className="relative flex items-start gap-3">
            <AvatarPicker
              avatarUrl={profile?.avatar_url ?? null}
              onChange={(url) =>
                setProfile((p) => (p ? { ...p, avatar_url: url } : p))
              }
            />

            <div className="min-w-0 flex-1 pt-1">
              <p className="truncate text-xl font-bold text-white drop-shadow">
                {profile?.display_name ?? "Member"}
              </p>
              <button
                type="button"
                onClick={copyCode}
                className="mt-0.5 flex items-center gap-1.5 text-sm text-sky-100/90"
              >
                ID: TVP{profile?.member_code ?? "—"}
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <motion.span
                className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  isAgent
                    ? "border-amber-300/70 bg-amber-900/50 text-amber-100"
                    : "border-sky-300/60 bg-[#0a2a7a]/80 text-sky-100"
                }`}
                animate={
                  isAgent
                    ? {
                        boxShadow: [
                          "0 0 8px rgba(251,191,36,0.3)",
                          "0 0 16px rgba(251,191,36,0.55)",
                          "0 0 8px rgba(251,191,36,0.3)",
                        ],
                      }
                    : undefined
                }
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Crown className="h-3.5 w-3.5 fill-amber-400 text-amber-300" />
                {badge}
              </motion.span>
            </div>

            <Link
              href="/profile/account"
              className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-200/70 bg-gradient-to-b from-[#4fb4ff] to-[#1560e8] px-3 py-1 text-xs font-semibold text-white"
              style={{
                boxShadow:
                  "0 0 10px rgba(56,160,255,0.6), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              <Pencil className="h-3 w-3" />
              Edit Profile
            </Link>
          </div>

          {/* Current plan + XP */}
          <div className="relative mt-3 flex items-center gap-3 rounded-xl border border-sky-300/30 bg-[#06153f]/70 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-amber-200/80 bg-[radial-gradient(circle_at_35%_30%,#fff1a8,#f5b000_55%,#9a5a00)]"
              style={{ boxShadow: "0 0 12px rgba(251,191,36,0.6)" }}
            >
              <Star className="h-5 w-5 fill-amber-100 text-amber-50" />
            </span>
            <div className="shrink-0 leading-tight">
              <p className="text-base font-extrabold text-white">
                {plan?.name.toUpperCase()}
              </p>
              <p className="text-[11px] text-sky-100/80">Current Plan</p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-white">
                  Level {profile?.level ?? 1}
                </span>
                <span className="text-sky-100/80">{xp} / 500 XP</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#020a24] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.9)]"
                  style={{ width: `${Math.min(100, (xp / 500) * 100)}%` }}
                />
              </div>
            </div>
            <Link href="/subscriptions" className="shrink-0">
              <ChevronRight className="h-5 w-5 text-white" />
            </Link>
          </div>

          <div className="relative mt-2 rounded-xl border border-cyan-400/30 bg-[#04102a]/85 px-2.5 py-2.5">
            <div className="flex items-start gap-2.5">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/40 bg-gradient-to-b from-cyan-500/30 to-blue-900/50"
                style={{ boxShadow: "0 0 10px rgba(34,211,238,0.35)" }}
              >
                <Film className="h-4 w-4 text-cyan-200" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/75">
                  Accumulated video access
                </p>
                {videoAccessActive && profile?.drama_access_ends_at ? (
                  <>
                    <p className="text-base font-extrabold text-white">
                      {videoAccessDays} day{videoAccessDays === 1 ? "" : "s"}{" "}
                      remaining
                    </p>
                    <p className="text-[11px] text-sky-100/70">
                      Active until{" "}
                      {formatDateManila(profile.drama_access_ends_at)} (PH)
                    </p>
                  </>
                ) : trialStreamingActive ? (
                  <>
                    <p className="text-sm font-bold text-white">
                      Free trial streaming
                    </p>
                    <p className="text-[11px] text-sky-100/70">
                      {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left on
                      trial · up to 10 episodes/day
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-slate-300">
                      No active video access
                    </p>
                    <Link
                      href="/renew"
                      className="text-[11px] font-medium text-sky-300 underline-offset-2 hover:underline"
                    >
                      Renew or upgrade a plan to add days
                    </Link>
                  </>
                )}
                {membershipDaysLeft > 0 &&
                  profile?.plan_slug !== "trial" &&
                  profile?.subscription_ends_at && (
                    <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[10px] text-sky-100/55">
                      Membership earnings tier: {membershipDaysLeft} day
                      {membershipDaysLeft === 1 ? "" : "s"} left (until{" "}
                      {formatDateManila(profile.subscription_ends_at)})
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <motion.div
          className="mb-3 grid grid-cols-3 gap-2"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          {statTiles.map((s) => {
            const tile = (
              <GlossPanel className="h-full px-2 py-2.5">
                <div className="flex items-center gap-1.5">
                  <GlossIcon icon={s.icon} tone={s.tone} size="h-8 w-8" />
                  <div className="min-w-0 leading-tight">
                    <p className="text-lg font-extrabold text-white">
                      {s.value.toLocaleString()}
                    </p>
                    <p className="truncate text-[10px] text-sky-100/80">
                      {s.label}
                    </p>
                  </div>
                </div>
              </GlossPanel>
            );
            return (
              <motion.div
                key={s.label}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                {s.label === "My Referrals" ? (
                  <Link href="/profile/referrals" className="block">
                    {tile}
                  </Link>
                ) : (
                  tile
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {plan?.minForAgent && profile?.agent_status === "none" && (
          <button
            type="button"
            onClick={applyAgent}
            className="mb-3 w-full rounded-xl border border-amber-400/50 bg-gradient-to-b from-amber-700/40 to-amber-950/40 py-2 text-sm font-semibold text-amber-100"
          >
            Apply for Agent program
          </button>
        )}
        {profile?.agent_status === "pending" && (
          <p className="mb-3 text-center text-xs text-amber-300">
            Agent application pending HQ approval
          </p>
        )}

        {/* Menu */}
        <motion.ul
          className="space-y-2"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
        >
          {menu.map((item) => {
            const inner = (
              <>
                <GlossIcon icon={item.icon} tone={item.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-sky-100/70">{item.sub}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/85" />
              </>
            );
            const rowClass = "flex items-center gap-3 px-3 py-2";
            return (
              <motion.li key={item.title} variants={rowVariants}>
                <GlossPanel border={TONES[item.tone].row}>
                  {item.href ? (
                    <Link href={item.href} className={rowClass}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={rowClass}>{inner}</div>
                  )}
                </GlossPanel>
              </motion.li>
            );
          })}
          <motion.li variants={rowVariants}>
            <GlossPanel border={TONES.red.row}>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 px-3 py-2 text-left"
              >
                <GlossIcon icon={LogOut} tone="red" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white">Logout</p>
                  <p className="text-xs text-sky-100/70">
                    Sign out from your account
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/85" />
              </button>
            </GlossPanel>
          </motion.li>
        </motion.ul>
        <p className="mt-4 text-center text-[10px] text-slate-500">
          Referral code: {profile?.referral_code}
        </p>
      </div>
    </div>
  );
}
