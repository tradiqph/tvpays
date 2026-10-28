"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
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
import { TransferSheet } from "@/components/wallet/TransferSheet";
import { WithdrawSheet } from "@/components/wallet/WithdrawSheet";
import type { WalletTransferDirection } from "@/lib/wallet-transfer";
import { AlertDialog } from "@/components/member/AlertDialog";
import { formatPhp } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { useCountUp } from "@/hooks/useCountUp";
import { WalletActivityHub } from "@/components/wallet/WalletActivityHub";
import { formatWalletWhen } from "@/lib/wallet-earnings";

const LEDGER_PAGE_SIZE = 15;

type LedgerRow = {
  id: string;
  amount: number;
  entry_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type WithdrawalRow = {
  id: string;
  net_amount: number;
  gross_amount: number;
  status: string;
  refund_status: string;
  destination_type: string;
  destination_number: string;
  requested_at: string;
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
  drama_episode: { label: "Episode reward", icon: Play, orb: ORBS.green },
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
  wallet_transfer_in: { label: "Transfer received", icon: Star, orb: ORBS.blue },
  wallet_transfer_out: { label: "Transfer sent", icon: Star, orb: ORBS.orange },
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
  transferLabel,
  onTransfer,
}: {
  accent: "blue" | "purple" | "green";
  title: string;
  amount: number;
  icon: ReactNode;
  actionLabel: string;
  onAction: () => void;
  transferLabel?: string;
  onTransfer?: () => void;
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
      {onTransfer ? (
        <button
          type="button"
          onClick={onTransfer}
          className="absolute right-2.5 top-2.5 text-white/90"
          aria-label={transferLabel ?? "Transfer balance"}
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      ) : null}
      <div className="relative flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-white/90">
            {title}
          </p>
          <p className="text-[28px] font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
            {formatPhp(animated)}
          </p>
          <div className="mt-1 flex flex-col items-end gap-1">
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
            {onTransfer && transferLabel ? (
              <button
                type="button"
                onClick={onTransfer}
                className="text-[11px] font-semibold text-white/85 underline-offset-2 hover:underline"
              >
                {transferLabel}
              </button>
            ) : null}
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
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDirection, setTransferDirection] =
    useState<WalletTransferDirection>("deposit_to_withdrawal");
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [withdrawBlockedOpen, setWithdrawBlockedOpen] = useState(false);
  const [lastWithdrawal, setLastWithdrawal] = useState<WithdrawalRow | null>(
    null,
  );

  const ledgerPages = Math.max(1, Math.ceil(ledgerTotal / LEDGER_PAGE_SIZE));
  const ledgerFrom =
    ledgerTotal === 0 ? 0 : (ledgerPage - 1) * LEDGER_PAGE_SIZE + 1;
  const ledgerTo = Math.min(ledgerTotal, ledgerPage * LEDGER_PAGE_SIZE);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await fetch("/api/wallet/withdrawals/sync", { method: "POST" }).catch(
      () => {},
    );

    const [{ data: wallet }, { data: profile }] = await Promise.all([
      supabase
        .from("wallets")
        .select("deposit_balance, withdrawal_balance")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("plan_slug, subscription_ends_at")
        .eq("id", user.id)
        .single(),
    ]);

    const paidActive =
      profile?.plan_slug &&
      profile.plan_slug !== "trial" &&
      profile.subscription_ends_at &&
      new Date(profile.subscription_ends_at).getTime() > Date.now();
    setCanWithdraw(Boolean(paidActive));

    if (wallet) {
      setDeposit(Number(wallet.deposit_balance));
      setWithdrawal(Number(wallet.withdrawal_balance));
    }

    setLedgerLoading(true);
    const from = (ledgerPage - 1) * LEDGER_PAGE_SIZE;
    const to = from + LEDGER_PAGE_SIZE - 1;

    const [{ count }, { data: rows }, { data: wdRows }] = await Promise.all([
      supabase
        .from("wallet_ledger")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("wallet_ledger")
        .select("id, amount, entry_type, created_at, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase
        .from("withdrawals")
        .select(
          "id, net_amount, gross_amount, status, refund_status, destination_type, destination_number, requested_at",
        )
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1),
    ]);
    setLedgerLoading(false);

    const total = count ?? 0;
    setLedgerTotal(total);
    const maxPage = Math.max(1, Math.ceil(total / LEDGER_PAGE_SIZE));
    if (ledgerPage > maxPage) {
      setLedgerPage(maxPage);
      return;
    }

    setLedger(
      (rows ?? []).map((r) => ({
        ...r,
        amount: Number(r.amount),
      })),
    );

    const latest = wdRows?.[0];
    setLastWithdrawal(
      latest
        ? {
            ...latest,
            net_amount: Number(latest.net_amount),
            gross_amount: Number(latest.gross_amount),
          }
        : null,
    );
  }, [ledgerPage]);

  useEffect(() => {
    load();
  }, [load]);

  function goLedgerPage(next: number) {
    const p = Math.min(Math.max(1, next), ledgerPages);
    if (p === ledgerPage) return;
    setLedgerPage(p);
  }

  function refreshAfterWithdraw() {
    if (ledgerPage !== 1) setLedgerPage(1);
    else void load();
  }

  function openTransfer(direction: WalletTransferDirection) {
    setTransferDirection(direction);
    setTransferOpen(true);
  }

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
              transferLabel="Move to withdrawal wallet"
              onTransfer={() => openTransfer("deposit_to_withdrawal")}
            />
          </motion.div>
          <motion.div variants={rowVariants}>
            <BalanceCard
              accent="green"
              title="Withdrawal Balance"
              amount={withdrawal}
              icon={<WithdrawIconArt />}
              actionLabel="Withdraw"
              onAction={() =>
                canWithdraw ? setWithdrawOpen(true) : setWithdrawBlockedOpen(true)
              }
              transferLabel="Move to deposit wallet"
              onTransfer={() => openTransfer("withdrawal_to_deposit")}
            />
          </motion.div>
        </motion.div>

        <div className="mt-5 space-y-6">
          <WalletActivityHub lastWithdrawal={lastWithdrawal} />

          <section className="w-full">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Earnings
            </p>
            <h2 className="text-lg font-bold text-white">Income history</h2>
          </div>
          {ledgerTotal > 0 && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Newest first
            </span>
          )}
        </div>
        <motion.ul
          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060d24]/95"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.3)",
          }}
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
            const planName =
              row.entry_type === "drama_episode" &&
              typeof row.metadata?.plan_name === "string"
                ? row.metadata.plan_name
                : null;
            const rowLabel = planName ? `${planName} episode` : meta.label;
            return (
              <motion.li
                key={row.id}
                variants={rowVariants}
                className="border-t border-white/[0.06] first:border-t-0"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10"
                    style={{
                      background: `linear-gradient(145deg, ${meta.orb.from}33, ${meta.orb.to}88)`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15)`,
                    }}
                  >
                    <Icon
                      className="h-4 w-4 text-white/95"
                      strokeWidth={2.2}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {rowLabel}
                      {refLevel ? (
                        <span className="ml-1 text-xs font-medium text-sky-300/80">
                          {refLevel}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatWalletWhen(row.created_at)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 font-mono text-sm font-bold tabular-nums ${
                      positive ? "text-emerald-300" : "text-rose-400"
                    }`}
                  >
                    {positive ? "+" : "−"}
                    {formatPhp(Math.abs(row.amount))}
                  </p>
                </div>
              </motion.li>
            );
          })}
          {ledger.length === 0 && !ledgerLoading && (
            <li className="py-8 text-center text-sm text-slate-400">
              No income yet — watch ads on Media or complete tasks.
            </li>
          )}
          {ledgerLoading && ledger.length === 0 && (
            <li className="py-8 text-center text-sm text-slate-400">
              Loading…
            </li>
          )}
        </motion.ul>
        {ledgerTotal > LEDGER_PAGE_SIZE && (
          <nav
            className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#070f28]/80 px-3 py-2.5"
            aria-label="Income history pagination"
          >
            <button
              type="button"
              disabled={ledgerPage <= 1 || ledgerLoading}
              onClick={() => goLedgerPage(ledgerPage - 1)}
              className="rounded-lg border border-sky-400/25 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Previous
            </button>
            <p className="text-center text-[11px] text-slate-400">
              <span className="font-mono text-slate-300">
                {ledgerFrom}–{ledgerTo}
              </span>{" "}
              of {ledgerTotal}
              <span className="hidden sm:inline">
                {" "}
                · Page {ledgerPage}/{ledgerPages}
              </span>
            </p>
            <button
              type="button"
              disabled={ledgerPage >= ledgerPages || ledgerLoading}
              onClick={() => goLedgerPage(ledgerPage + 1)}
              className="rounded-lg border border-sky-400/25 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next
            </button>
          </nav>
        )}
          </section>
        </div>
      </div>

      <TopupSheet open={topupOpen} onClose={() => setTopupOpen(false)} />
      <TransferSheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        direction={transferDirection}
        depositBalance={deposit}
        withdrawalBalance={withdrawal}
        onSuccess={() => void load()}
      />
      <WithdrawSheet
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        maxAmount={withdrawal}
        onSuccess={refreshAfterWithdraw}
      />
      <AlertDialog
        open={withdrawBlockedOpen}
        onClose={() => setWithdrawBlockedOpen(false)}
        title="Subscription required"
        message={
          <>
            Withdrawals require an active paid subscription.{" "}
            <Link
              href="/subscriptions"
              className="font-semibold text-sky-300 underline"
              onClick={() => setWithdrawBlockedOpen(false)}
            >
              Choose a plan on Subscriptions
            </Link>
          </>
        }
      />
    </div>
  );
}
