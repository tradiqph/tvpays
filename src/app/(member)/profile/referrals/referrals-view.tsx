"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Link2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { GlassPanel } from "@/components/member/GlassPanel";
import { StatTile } from "@/components/member/StatTile";
import { formatDateManila, formatPhp } from "@/lib/format";
import { planBySlug } from "@/lib/plans";
import type { MemberReferralsPayload } from "@/lib/member-referrals";

function CopyButton({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-400/45 bg-[#0b1d4d]/80 py-2.5 text-sm font-semibold text-white"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-300" />
      ) : (
        <Copy className="h-4 w-4 text-sky-200" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}

export function ReferralsView() {
  const [data, setData] = useState<MemberReferralsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/member/referrals");
      if (res.ok) {
        setData((await res.json()) as MemberReferralsPayload);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rateLine =
    data?.rates
      .map((r) => `${r.key} ${(r.rate * 100).toFixed(0)}%`)
      .join(" · ") ?? "L1 5% · L2 3% · L3 1%";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader variant="profile" />
      <SubPageHeader title="My Referrals" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {loading && !data ? (
          <p className="py-10 text-center text-sm text-sky-200/70">Loading…</p>
        ) : data ? (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassPanel className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/70">
                Your invite code
              </p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-wider text-white">
                {data.referralCode}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-sky-100/75">
                Earn {rateLine} when someone in your network{" "}
                <span className="font-semibold text-white">
                  buys a plan or adds video access days
                </span>
                . Deposit top-ups alone do not pay commission.
              </p>
              <div className="mt-3 flex gap-2">
                <CopyButton label="Copy code" text={data.referralCode} />
                <CopyButton label="Copy link" text={data.inviteUrl} />
              </div>
            </GlassPanel>

            <div className="grid grid-cols-2 gap-2">
              <StatTile
                icon={Users}
                label="L1 team"
                value={String(data.teamCounts.l1)}
                variant="blue"
              />
              <StatTile
                icon={UserPlus}
                label="L2 team"
                value={String(data.teamCounts.l2)}
                variant="purple"
              />
              <StatTile
                icon={Link2}
                label="L3 team"
                value={String(data.teamCounts.l3)}
                variant="blue"
              />
              <StatTile
                icon={Wallet}
                label="Referral earnings"
                value={formatPhp(data.totalEarnings)}
                variant="gold"
              />
            </div>

            <div>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-sky-200/80">
                Direct referrals (L1)
              </h2>
              {data.l1Team.length === 0 ? (
                <GlassPanel className="py-8 text-center text-sm text-sky-200/65">
                  Share your link — when friends sign up and buy a plan, they appear
                  here.
                </GlassPanel>
              ) : (
                <ul className="space-y-2">
                  {data.l1Team.map((m) => {
                    const plan = planBySlug(m.planSlug);
                    return (
                      <li key={m.memberCode}>
                        <GlassPanel className="flex items-center gap-3 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {m.displayName ?? "Member"}
                            </p>
                            <p className="text-xs text-sky-200/65">
                              TVP{m.memberCode} · Joined{" "}
                              {formatDateManila(m.joinedAt)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-sky-400/40 bg-sky-950/50 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-100">
                            {plan?.name ?? m.planSlug}
                          </span>
                        </GlassPanel>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-sky-200/80">
                  Recent commissions
                </h2>
                <Link
                  href="/wallet"
                  className="text-xs font-medium text-sky-300 underline-offset-2 hover:underline"
                >
                  Wallet
                </Link>
              </div>
              {data.recentCommissions.length === 0 ? (
                <GlassPanel className="py-6 text-center text-sm text-sky-200/65">
                  No referral commissions yet.
                </GlassPanel>
              ) : (
                <ul className="divide-y divide-sky-400/20 overflow-hidden rounded-2xl border border-sky-400/35 bg-[#0a2263]/60">
                  {data.recentCommissions.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Referral gift
                          {row.level ? (
                            <span className="ml-1.5 text-sky-300/80">
                              ({row.level})
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-sky-200/60">
                          {formatDateManila(row.createdAt)}
                        </p>
                      </div>
                      <p className="text-base font-bold text-emerald-300">
                        + {formatPhp(row.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ) : (
          <p className="py-10 text-center text-sm text-rose-300/90">
            Could not load referrals. Try again later.
          </p>
        )}
      </div>
    </div>
  );
}
