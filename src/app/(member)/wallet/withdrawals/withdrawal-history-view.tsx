"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Banknote, TrendingUp } from "lucide-react";
import { MemberHeader } from "@/components/member/MemberHeader";
import { SubPageHeader } from "@/components/member/SubPageHeader";
import { WithdrawalStatusChip } from "@/components/wallet/WithdrawalStatusChip";
import { formatPhp } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import {
  WITHDRAWAL_EARNING_ENTRY_TYPES,
  formatWalletWhen,
} from "@/lib/wallet-earnings";
import { useCountUp } from "@/hooks/useCountUp";
import { WITHDRAWAL_LIST_VISIBLE } from "@/lib/withdrawals";

const PAGE_SIZE = 12;

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

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof TrendingUp;
  accent: "sky" | "emerald";
}) {
  const animated = useCountUp(value);
  const styles =
    accent === "sky"
      ? {
          border: "border-sky-400/30",
          glow: "0 0 28px rgba(56,189,248,0.12)",
          icon: "from-sky-400/25 to-sky-600/10 text-sky-200",
          value: "text-sky-50",
        }
      : {
          border: "border-emerald-400/30",
          glow: "0 0 28px rgba(52,211,153,0.12)",
          icon: "from-emerald-400/25 to-emerald-600/10 text-emerald-200",
          value: "text-emerald-50",
        };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-[#070f28]/90 p-4 backdrop-blur-md ${styles.border}`}
      style={{ boxShadow: styles.glow }}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/[0.04] blur-2xl" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight ${styles.value}`}
          >
            {formatPhp(animated)}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${styles.icon}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}

export function WithdrawalHistoryView() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    await fetch("/api/wallet/withdrawals/sync", { method: "POST" }).catch(
      () => {},
    );

    const rangeFrom = (page - 1) * PAGE_SIZE;
    const rangeTo = rangeFrom + PAGE_SIZE - 1;

    const [
      { count },
      { data: wdRows },
      { data: earnRows },
      { data: completedRows },
    ] = await Promise.all([
      supabase
        .from("withdrawals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE),
      supabase
        .from("withdrawals")
        .select(
          "id, net_amount, gross_amount, status, refund_status, destination_type, destination_number, requested_at",
        )
        .eq("user_id", user.id)
        .eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE)
        .order("requested_at", { ascending: false })
        .range(rangeFrom, rangeTo),
      supabase
        .from("wallet_ledger")
        .select("amount")
        .eq("user_id", user.id)
        .eq("bucket", "withdrawal")
        .in("entry_type", [...WITHDRAWAL_EARNING_ENTRY_TYPES]),
      supabase
        .from("withdrawals")
        .select("gross_amount")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE),
    ]);

    const earned =
      earnRows?.reduce(
        (s, r) => s + (Number(r.amount) > 0 ? Number(r.amount) : 0),
        0,
      ) ?? 0;
    const withdrawn =
      completedRows?.reduce((s, r) => s + Number(r.gross_amount), 0) ?? 0;

    setTotalEarned(earned);
    setTotalWithdrawn(withdrawn);
    setTotal(count ?? 0);

    const maxPage = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
    if (page > maxPage) {
      setPage(maxPage);
      setLoading(false);
      return;
    }

    setRows(
      (wdRows ?? []).map((r) => ({
        ...r,
        net_amount: Number(r.net_amount),
        gross_amount: Number(r.gross_amount),
      })),
    );
    setLoading(false);
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function goPage(next: number) {
    const p = Math.min(Math.max(1, next), pages);
    if (p === page) return;
    setPage(p);
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <MemberHeader />
      <SubPageHeader title="Withdrawal history" back="/wallet" />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <motion.div
          className="mb-5 grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <StatTile
            label="Total earned"
            value={totalEarned}
            icon={TrendingUp}
            accent="sky"
          />
          <StatTile
            label="Total withdrawn"
            value={totalWithdrawn}
            icon={Banknote}
            accent="emerald"
          />
        </motion.div>

        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Payout ledger
            </p>
            <h2 className="text-lg font-bold text-white">All requests</h2>
          </div>
          {total > 0 && (
            <p className="text-xs text-slate-400">
              {total} {total === 1 ? "record" : "records"}
            </p>
          )}
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#060d24]/95"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 40px rgba(0,0,0,0.35)",
          }}
        >
          {loading && rows.length === 0 ? (
            <p className="py-14 text-center text-sm text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <ArrowUpRight className="mx-auto h-9 w-9 text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-300">
                No withdrawals yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                When you cash out from your withdrawal balance, entries appear here.
              </p>
            </div>
          ) : (
            <ul>
              {rows.map((row, i) => {
                const dest =
                  row.destination_type === "maya" ? "Maya" : "GCash";
                return (
                  <li
                    key={row.id}
                    className={`flex items-center gap-3 px-4 py-3.5 ${
                      i > 0 ? "border-t border-white/[0.06]" : ""
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 to-[#0a1638]">
                      <ArrowDownLeft className="h-5 w-5 text-emerald-300/90" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-base font-bold tabular-nums text-white">
                        {formatPhp(row.net_amount)}
                        <span className="ml-1.5 text-xs font-medium text-slate-500">
                          net
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {dest} · {row.destination_number}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatWalletWhen(row.requested_at)}
                      </p>
                    </div>
                    <WithdrawalStatusChip row={row} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {total > PAGE_SIZE && (
          <nav
            className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-[#070f28]/80 px-3 py-2.5"
            aria-label="Withdrawal history pagination"
          >
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goPage(page - 1)}
              className="rounded-lg border border-sky-400/25 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Previous
            </button>
            <p className="text-center text-[11px] text-slate-400">
              <span className="font-mono text-slate-300">
                {from}–{to}
              </span>{" "}
              of {total}
              <span className="hidden sm:inline">
                {" "}
                · Page {page}/{pages}
              </span>
            </p>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => goPage(page + 1)}
              className="rounded-lg border border-sky-400/25 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
