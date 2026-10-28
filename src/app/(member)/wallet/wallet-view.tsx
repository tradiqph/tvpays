"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Play,
  Video,
  UserPlus,
  Trophy,
  Star,
} from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import {
  DepositIconArt,
  WithdrawIconArt,
} from "@/components/member/WalletIconArt";
import { TopupSheet } from "@/components/wallet/TopupSheet";
import { WithdrawSheet } from "@/components/wallet/WithdrawSheet";
import { formatPhp } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { useCountUp } from "@/hooks/useCountUp";

type LedgerRow = {
  id: string;
  amount: number;
  entry_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function referralLevelLabel(meta: Record<string, unknown> | null): string | null {
  if (!meta || typeof meta.level !== "string") return null;
  const level = meta.level;
  if (level === "A") return "L1";
  if (level === "B") return "L2";
  if (level === "C") return "L3";
  if (level === "L1" || level === "L2" || level === "L3") return level;
  return level;
}

type Orb = { from: string; to: string; glow: string };

const ORBS = {
  green: { from: "#4ade80", to: "#15803d", glow: "rgba(34,197,94,0.6)" },
  purple: { from: "#a78bfa", to: "#5b21b6", glow: "rgba(139,92,246,0.6)" },
  magenta: { from: "#f472b6", to: "#a21caf", glow: "rgba(236,72,153,0.6)" },
  orange: { from: "#fcd34d", to: "#c2410c", glow: "rgba(251,146,60,0.6)" },
  blue: { from: "#7dd3fc", to: "#1d4ed8", glow: "rgba(56,189,248,0.6)" },
} satisfies Record<string, Orb>;

const entryMeta: Record<
  string,
  { label: string; icon: typeof Play; orb: Orb }
> = {
  ad_reward: { label: "Ad Reward", icon: Play, orb: ORBS.green },
  referral_ad: { label: "Referral Bonus", icon: UserPlus, orb: ORBS.magenta },
  referral_upgrade: {
    label: "Referral Gift",
    icon: UserPlus,
    orb: ORBS.magenta,
  },
  daily_checkin: { label: "Daily Check-in", icon: Star, orb: ORBS.blue },
  starpago_deposit: { label: "Top up", icon: Star, orb: ORBS.blue },
  plan_purchase: { label: "Plan purchase", icon: Trophy, orb: ORBS.orange },
  withdrawal_request: { label: "Withdrawal", icon: Trophy, orb: ORBS.orange },
  agent_sale: { label: "Agent bonus", icon: UserPlus, orb: ORBS.magenta },
};

const CARD_STYLES = {
  blue: {
    bg: "from-[#1a6dff] via-[#0d43b8] to-[#071f63]",
    border: "border-sky-300/80",
    glow: "rgba(40,130,255,0.55)",
    btn: "from-[#4fb4ff] to-[#1560e8] border-sky-200/80",
    btnGlow: "rgba(56,160,255,0.7)",
  },
  purple: {
    bg: "from-[#b23cf0] via-[#6d1bc4] to-[#2c0a63]",
    border: "border-fuchsia-300/80",
    glow: "rgba(190,60,255,0.55)",
    btn: "from-[#d77bff] to-[#8b2fe0] border-fuchsia-200/80",
    btnGlow: "rgba(217,70,239,0.7)",
  },
  green: {
    bg: "from-[#1fd16a] via-[#0b8a45] to-[#053d21]",
    border: "border-emerald-300/80",
    glow: "rgba(34,220,110,0.5)",
    btn: "from-[#5ef08f] to-[#109a48] border-emerald-200/80",
    btnGlow: "rgba(34,197,94,0.7)",
  },
} as const;

function formatWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}  ${time}`;
}

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 },
};

function BalanceCard({
  accent,
  title,
  amount,
  icon,
  actionLabel,
  onAction,
}: {
  accent: "blue" | "purple" | "green";
  title: string;
  amount: number;
  icon: ReactNode;
  actionLabel: string;
  onAction: () => void;
}) {
  const animated = useCountUp(amount);
  const st = CARD_STYLES[accent];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-3 ${st.bg} ${st.border}`}
      style={{
        boxShadow: `0 0 22px ${st.glow}, inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -10px 24px rgba(0,0,0,0.25)`,
      }}
    >
      {/* top gloss + diagonal light streak */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-8 h-40 w-24 rotate-[35deg] bg-gradient-to-b from-white/25 to-transparent blur-md" />
      <button
        type="button"
        className="absolute right-2.5 top-2.5 text-white/90"
        aria-label="More options"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      <div className="relative flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-white/90">
            {title}
          </p>
          <p className="text-[28px] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
            {formatPhp(animated)}
          </p>
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={onAction}
              className={`inline-flex items-center gap-1 rounded-full border bg-gradient-to-b px-4 py-1.5 text-sm font-bold text-white ${st.btn}`}
              style={{
                boxShadow: `0 0 12px ${st.btnGlow}, inset 0 1px 0 rgba(255,255,255,0.6)`,
              }}
            >
              {actionLabel}{" "}
              <ChevronRight className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WalletView() {
  const [deposit, setDeposit] = useState(0);
  const [withdrawal, setWithdrawal] = useState(0);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: wallet } = await supabase
      .from("wallets")
      .select("deposit_balance, withdrawal_balance")
      .eq("user_id", user.id)
      .single();

    if (wallet) {
      setDeposit(Number(wallet.deposit_balance));
      setWithdrawal(Number(wallet.withdrawal_balance));
    }

    const { data: rows } = await supabase
      .from("wallet_ledger")
      .select("id, amount, entry_type, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setLedger(
      (rows ?? []).map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.div variants={rowVariants}>
            <BalanceCard
              accent="blue"
              title="Deposit Balance"
              amount={deposit}
              icon={<DepositIconArt />}
              actionLabel="Topup"
              onAction={() => setTopupOpen(true)}
            />
          </motion.div>
          <motion.div variants={rowVariants}>
            <BalanceCard
              accent="green"
              title="Withdrawal Balance"
              amount={withdrawal}
              icon={<WithdrawIconArt />}
              actionLabel="Withdraw"
              onAction={() => setWithdrawOpen(true)}
            />
          </motion.div>
        </motion.div>

        <div className="mb-2 mt-5 flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-white">
            Income history
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-sky-400/40 bg-[#0b1d4d]/80 px-3 py-1.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
          >
            Latest <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <motion.ul
          className="divide-y divide-sky-300/15 overflow-hidden rounded-2xl border border-sky-400/40 bg-gradient-to-b from-[#0d2a6e]/70 to-[#06143a]/80 shadow-[0_0_20px_rgba(40,120,255,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {ledger.map((row) => {
            const meta = entryMeta[row.entry_type] ?? {
              label: row.entry_type,
              icon: Video,
              orb: ORBS.purple,
            };
            const Icon = meta.icon;
            const positive = row.amount >= 0;
            const refLevel =
              row.entry_type === "referral_upgrade"
                ? referralLevelLabel(row.metadata)
                : null;
            return (
              <motion.li key={row.id} variants={rowVariants}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/50"
                    style={{
                      background: `radial-gradient(circle at 35% 28%, ${meta.orb.from}, ${meta.orb.to} 75%)`,
                      boxShadow: `0 0 12px ${meta.orb.glow}, inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -4px 6px rgba(0,0,0,0.3)`,
                    }}
                  >
                    <Icon
                      className="h-5 w-5 fill-white/90 text-white"
                      strokeWidth={2.2}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-white">
                      {meta.label}
                      {refLevel ? (
                        <span className="ml-1 text-sm font-medium text-sky-300/90">
                          ({refLevel})
                        </span>
                      ) : null}
                    </p>
                    <p className="whitespace-pre text-xs text-slate-300/90">
                      {formatWhen(row.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`text-lg font-extrabold ${
                        positive
                          ? "text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                          : "text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.5)]"
                      }`}
                    >
                      {positive ? "+ " : "− "}
                      {formatPhp(Math.abs(row.amount))}
                    </p>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </div>
              </motion.li>
            );
          })}
          {ledger.length === 0 && (
            <li className="py-8 text-center text-sm text-slate-400">
              No income yet — watch ads on Media or complete tasks.
            </li>
          )}
        </motion.ul>
      </div>

      <TopupSheet open={topupOpen} onClose={() => setTopupOpen(false)} />
      <WithdrawSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        maxAmount={withdrawal}
        onSuccess={load}
      />
    </div>
  );
}
