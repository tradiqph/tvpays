import { Suspense } from "react";
import { Banknote } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, EmptyState, MemberCell, PageHeader, Pagination, StatusBadge, TableSkeleton, Tabs, table } from "@/components/hq/ui";
import { WithdrawalActions } from "@/components/hq/actions";
import { SearchBox } from "@/components/hq/controls";
import { dateTime, php, safeSearch } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";

const PAGE_SIZE = 25;
const STATUSES = ["pending", "processing", "frozen", "completed", "failed", "rejected"] as const;

type Params = { status?: string; q?: string; page?: string };

type Row = {
  id: string;
  user_id: string;
  status: string;
  gross_amount: number;
  tax_amount: number;
  net_amount: number;
  destination_type: string;
  destination_number: string;
  destination_name: string;
  requested_at: string;
  completed_at: string | null;
  failure_reason: string | null;
  paymongo_transfer_id: string | null;
  starpago_order_no: string | null;
  starpago_order_status: number | null;
  refund_status: string;
  profiles: { member_code: string; display_name: string | null; avatar_url: string | null } | null;
};

function href(p: Params, page = 1) {
  const sp = new URLSearchParams();
  if (p.status) sp.set("status", p.status);
  if (p.q) sp.set("q", p.q);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return `/hq/withdrawals${qs ? `?${qs}` : ""}`;
}

async function StatusTabs({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const active = statusOf(params);
  const admin = createAdminClient();
  const counts = await Promise.all(
    STATUSES.map((s) => admin.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", s)),
  );
  return (
    <Tabs
      tabs={[
        ...STATUSES.map((s, i) => ({
          label: s.charAt(0).toUpperCase() + s.slice(1),
          href: href({ status: s, q: params.q }),
          active: active === s,
          count: counts[i].count ?? 0,
        })),
        { label: "All", href: href({ status: "all", q: params.q }), active: active === "all" },
      ]}
    />
  );
}

function statusOf(p: Params) {
  const s = p.status ?? "pending";
  return s === "all" || (STATUSES as readonly string[]).includes(s) ? s : "pending";
}

async function WithdrawalsTable({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getHqTimeContext();
  const params = await searchParams;
  const status = statusOf(params);
  const page = Math.max(1, Number(params.page) || 1);
  const q = safeSearch(params.q);

  let query = createAdminClient()
    .from("withdrawals")
    .select(
      "id, user_id, status, gross_amount, tax_amount, net_amount, destination_type, destination_number, destination_name, requested_at, completed_at, failure_reason, paymongo_transfer_id, starpago_order_no, starpago_order_status, refund_status, profiles(member_code, display_name, avatar_url)",
      { count: "exact" },
    )
    // Oldest first while reviewing so nobody waits longest; newest first elsewhere.
    .order("requested_at", { ascending: status === "pending" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`destination_number.ilike.%${q}%,destination_name.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) return <EmptyState title="Couldn't load withdrawals" text={error.message} />;
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) {
    return (
      <EmptyState
        icon={Banknote}
        title={status === "pending" ? "No payouts waiting" : "Nothing here"}
        text={status === "pending" ? "New withdrawal requests will show up here." : undefined}
      />
    );
  }

  const memberLabel = (r: Row) => r.profiles?.display_name || `TVP${r.profiles?.member_code ?? ""}`;
  const dest = (r: Row) => `${r.destination_type} · ${r.destination_number} (${r.destination_name})`;
  const totalNet = rows.reduce((s, r) => s + Number(r.net_amount), 0);

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5 text-xs text-slate-400">
        <span>{count ?? rows.length} request{count === 1 ? "" : "s"}</span>
        <span>
          This page: <span className="font-semibold text-white tabular-nums">{php(totalNet)}</span> net
        </span>
      </div>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead className={table.head}>
            <tr>
              <th className={table.th}>Member</th>
              <th className={`${table.th} text-right`}>Net payout</th>
              <th className={table.th}>Destination</th>
              <th className={table.th}>Status</th>
              <th className={table.th}>Requested</th>
              <th className={table.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={table.row}>
                <td className={table.td}>
                  <MemberCell name={r.profiles?.display_name} code={r.profiles?.member_code} avatar={r.profiles?.avatar_url} href={`/hq/members/${r.user_id}`} />
                </td>
                <td className={`${table.td} text-right`}>
                  <span className="block font-semibold text-white tabular-nums">{php(r.net_amount)}</span>
                  <span className="block text-[11px] text-slate-500 tabular-nums">gross {php(r.gross_amount)}</span>
                </td>
                <td className={`${table.td} text-xs`}>
                  <span className="block text-slate-200">{r.destination_name}</span>
                  <span className="block font-mono text-slate-500">{r.destination_type} · {r.destination_number}</span>
                </td>
                <td className={table.td}>
                  <StatusBadge status={r.status} />
                  {r.starpago_order_no && (
                    <span className="mt-1 block font-mono text-[10px] text-slate-500" title="Gateway order">
                      {r.starpago_order_no}
                      {r.starpago_order_status != null ? ` · status ${r.starpago_order_status}` : ""}
                    </span>
                  )}
                  {r.failure_reason && <span className="mt-1 block max-w-[200px] truncate text-[11px] text-rose-300/80" title={r.failure_reason}>{r.failure_reason}</span>}
                </td>
                <td className={`${table.td} text-xs text-slate-400`} title={dateTime(r.requested_at)}>
                  {t.relative(r.requested_at)}
                </td>
                <td className={table.td}>
                  <WithdrawalActions id={r.id} status={r.status} net={Number(r.net_amount)} gross={Number(r.gross_amount)} member={memberLabel(r)} destination={dest(r)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={table.list}>
        {rows.map((r) => (
          <li key={r.id} className={table.item}>
            <div className="flex items-start justify-between gap-3">
              <MemberCell name={r.profiles?.display_name} code={r.profiles?.member_code} avatar={r.profiles?.avatar_url} href={`/hq/members/${r.user_id}`} />
              <div className="text-right">
                <p className="font-semibold text-white tabular-nums">{php(r.net_amount)}</p>
                <StatusBadge status={r.status} />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              {dest(r)} · {t.relative(r.requested_at)}
            </p>
            {r.failure_reason && <p className="text-[11px] text-rose-300/80">{r.failure_reason}</p>}
            <WithdrawalActions id={r.id} status={r.status} net={Number(r.net_amount)} gross={Number(r.gross_amount)} member={memberLabel(r)} destination={dest(r)} />
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => href(params, p)} />
    </>
  );
}

export default function HqWithdrawalsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader title="Withdrawals" description="Review requests, approve payouts, resolve frozen transfers, or reject and refund." />
      <Suspense fallback={<div className="mb-4 h-8" />}>
        <StatusTabs searchParams={searchParams} />
      </Suspense>
      <div className="mb-4 flex">
        <Suspense fallback={null}>
          <SearchBox placeholder="Search account number or name" />
        </Suspense>
      </div>
      <Card padded={false}>
        <Suspense fallback={<TableSkeleton />}>
          <WithdrawalsTable searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}
