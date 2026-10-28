"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "@/components/hq/ui";
import { Button } from "@/components/hq/controls";
import { dateTime, humanize, php } from "@/lib/hq/format";

const TABS = [
  { id: "summary", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "deposits", label: "Deposits" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "referrals", label: "Referrals" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Summary = {
  profile: {
    member_code: string;
    display_name: string | null;
    referral_code: string;
    plan_name: string;
    subscription_ends_at: string | null;
    drama_access_ends_at: string | null;
    created_at: string;
  };
  email: string | null;
  wallet: { deposit: number; spending: number; withdrawal: number } | null;
  upline: { id: string; member_code: string; display_name: string | null } | null;
  counts: { ledger: number; referrals: number };
};

export function MemberAuditView({
  memberId,
  backHref,
}: {
  memberId: string;
  backHref: string;
}) {
  const [tab, setTab] = useState<TabId>("summary");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ section: tab });
      if (tab !== "summary") {
        params.set("limit", String(limit));
        params.set("offset", String(offset));
      }
      const res = await fetch(
        `/api/hq/members/${memberId}/audit?${params.toString()}`,
      );
      const json = (await res.json()) as Record<string, unknown> & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Load failed");

      if (tab === "summary") {
        setSummary(json as unknown as Summary);
        setRows([]);
        setTotal(0);
      } else {
        setRows((json.rows as Record<string, unknown>[]) ?? []);
        setTotal(Number(json.total) || 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [memberId, tab, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [tab]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-sky-300 hover:text-sky-200"
        >
          <ChevronLeft className="h-4 w-4" /> Back to member
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id
                ? "bg-sky-500/25 text-sky-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {loading && tab === "summary" && (
        <Card>
          <p className="text-sm text-slate-400">Loading…</p>
        </Card>
      )}

      {!loading && tab === "summary" && summary && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Account">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[11px] text-slate-500">Name</dt>
                <dd className="text-slate-200">
                  {summary.profile.display_name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Code</dt>
                <dd className="font-mono text-slate-200">
                  TVP{summary.profile.member_code}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] text-slate-500">Email</dt>
                <dd className="text-slate-200">{summary.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Plan</dt>
                <dd className="text-slate-200">{summary.profile.plan_name}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Referral code</dt>
                <dd className="text-slate-200">{summary.profile.referral_code}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Subscription until</dt>
                <dd className="text-slate-200">
                  {dateTime(summary.profile.subscription_ends_at)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Drama access until</dt>
                <dd className="text-slate-200">
                  {dateTime(summary.profile.drama_access_ends_at)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Upline</dt>
                <dd className="text-slate-200">
                  {summary.upline ? (
                    <Link
                      href={`/hq/members/${summary.upline.id}`}
                      className="text-sky-300 hover:underline"
                    >
                      TVP{summary.upline.member_code}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-500">Direct referrals</dt>
                <dd className="text-slate-200">{summary.counts.referrals}</dd>
              </div>
            </dl>
          </Card>
          <Card title="Wallet">
            {summary.wallet ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Deposit</dt>
                  <dd className="font-semibold text-sky-200">
                    {php(summary.wallet.deposit)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Withdrawable</dt>
                  <dd className="font-semibold text-emerald-200">
                    {php(summary.wallet.withdrawal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Spending</dt>
                  <dd className="text-slate-200">{php(summary.wallet.spending)}</dd>
                </div>
                <p className="pt-2 text-[11px] text-slate-500">
                  {summary.counts.ledger.toLocaleString()} ledger entries total
                </p>
              </dl>
            ) : (
              <EmptyState title="No wallet" />
            )}
          </Card>
        </div>
      )}

      {tab === "transactions" && !loading && (
        <Card title="Wallet ledger" padded={false}>
          {rows.length === 0 ? (
            <EmptyState title="No transactions" />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {rows.map((r) => {
                const amt = Number(r.amount);
                return (
                  <li
                    key={String(r.id)}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span>
                      <span className="block text-slate-200">
                        {humanize(String(r.entry_type))}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {humanize(String(r.bucket))} · {dateTime(String(r.created_at))}
                      </span>
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${amt >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                    >
                      {amt >= 0 ? "+" : "−"}
                      {php(Math.abs(amt))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {tab === "deposits" && !loading && (
        <Card title="StarPago deposits" padded={false}>
          {rows.length === 0 ? (
            <EmptyState title="No deposits" />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <li
                  key={String(r.id)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="block font-semibold text-white tabular-nums">
                      {php(Number(r.amount))}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {String(r.pay_method)} · {dateTime(String(r.created_at))}
                    </span>
                  </span>
                  <StatusBadge status={String(r.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "withdrawals" && !loading && (
        <Card title="Withdrawals" padded={false}>
          {rows.length === 0 ? (
            <EmptyState title="No withdrawals" />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <li
                  key={String(r.id)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="block font-semibold text-white tabular-nums">
                      {php(Number(r.net_amount))} net
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {String(r.destination_type)} · {dateTime(String(r.requested_at))}
                    </span>
                  </span>
                  <StatusBadge status={String(r.status)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "referrals" && !loading && (
        <Card title="Direct referrals" padded={false}>
          {rows.length === 0 ? (
            <EmptyState title="No referrals" />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <li key={String(r.id)} className="px-4 py-2.5 text-sm">
                  <Link
                    href={`/hq/members/${String(r.id)}`}
                    className="font-medium text-sky-300 hover:underline"
                  >
                    {String(r.display_name ?? "Unnamed")} · TVP
                    {String(r.member_code)}
                  </Link>
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {humanize(String(r.plan_slug))} · {dateTime(String(r.created_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab !== "summary" && total > limit && (
        <div className="flex items-center justify-between gap-2 text-sm text-slate-400">
          <span>
            Page {page} of {pages} · {total} rows
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={offset <= 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="secondary"
              disabled={offset + limit >= total || loading}
              onClick={() => setOffset(offset + limit)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
