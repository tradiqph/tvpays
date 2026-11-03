"use client";

import Link from "next/link";
import { ChevronRight, History } from "lucide-react";
import { formatPhp } from "@/lib/format";
import { formatWalletWhen } from "@/lib/wallet-earnings";
import { WithdrawalStatusChip } from "@/components/wallet/WithdrawalStatusChip";

type PreviewWithdrawal = {
  id: string;
  net_amount: number;
  status: string;
  refund_status: string;
  requested_at: string;
  destination_type: string;
};

export function WalletActivityHub({
  lastWithdrawal,
}: {
  lastWithdrawal: PreviewWithdrawal | null;
}) {
  return (
    <section className="w-full">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Activity
      </p>

      <Link
        href="/wallet/withdrawals"
        className="block w-full max-w-full no-underline outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060d24]"
      >
        <div
          className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.09] bg-[#070f28]/95 p-4 transition hover:border-emerald-400/25"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.28)",
          }}
        >
          <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-emerald-500/[0.07] blur-2xl transition group-hover:bg-emerald-400/10" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 to-[#0a1a3d]">
              <History className="h-6 w-6 text-emerald-200" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-white">
                  Withdrawal history
                </h3>
                <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-emerald-300/90">
                  View all
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Track payouts, status, and lifetime totals earned vs withdrawn.
              </p>
              {lastWithdrawal ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] text-slate-500">
                      Latest ·{" "}
                      {lastWithdrawal.destination_type === "maya"
                        ? "Maya"
                        : "GCash"}
                    </p>
                    <p className="font-mono text-sm font-bold tabular-nums text-white">
                      {formatPhp(lastWithdrawal.net_amount)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatWalletWhen(lastWithdrawal.requested_at)}
                    </p>
                  </div>
                  <WithdrawalStatusChip row={lastWithdrawal} />
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  No withdrawals yet — tap when you&apos;re ready to cash out.
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
