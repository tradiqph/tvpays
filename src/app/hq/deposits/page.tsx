import { Suspense } from "react";
import { ArrowDownToLine, CheckCircle2, Clock, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, EmptyState, MemberCell, PageHeader, Pagination, Skeleton, StatCard, StatusBadge, TableSkeleton, Tabs, table } from "@/components/hq/ui";
import { SearchBox } from "@/components/hq/controls";
import { dateTime, manilaDay, php, safeSearch } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";

const PAGE_SIZE = 25;
const STATUSES = ["paid", "pending", "failed", "expired"] as const;

type Params = { status?: string; q?: string; page?: string };

type Row = {
  id: string;
  user_id: string;
  amount: number;
  fee_php: number;
  net_php: number;
  status: string;
  pay_method: string;
  mer_order_no: string;
  payer_mobile: string | null;
  created_at: string;
  paid_at: string | null;
  profiles: { member_code: string; display_name: string | null; avatar_url: string | null } | null;
};

function href(p: Params, page = 1) {
  const sp = new URLSearchParams();
  if (p.status) sp.set("status", p.status);
  if (p.q) sp.set("q", p.q);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return `/hq/deposits${qs ? `?${qs}` : ""}`;
}

async function Summary() {
  const t = await getHqTimeContext();
  const admin = createAdminClient();
  const [paid, pending, failed] = await Promise.all([
    admin.from("starpago_deposits").select("amount, paid_at").eq("status", "paid").gte("paid_at", t.daysAgoIso(30)).limit(50000),
    admin.from("starpago_deposits").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("starpago_deposits").select("id", { count: "exact", head: true }).in("status", ["failed", "expired"]).gte("created_at", t.daysAgoIso(7)),
  ]);
  const today = t.manilaToday();
  const rows = paid.data ?? [];
  const todaySum = rows.filter((r) => r.paid_at && manilaDay(r.paid_at) === today).reduce((s, r) => s + Number(r.amount), 0);
  const monthSum = rows.reduce((s, r) => s + Number(r.amount), 0);
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard label="Paid today" value={php(todaySum)} icon={CheckCircle2} tone="emerald" />
      <StatCard label="Paid · 30 days" value={php(monthSum)} hint={`${rows.length} payments`} icon={ArrowDownToLine} tone="sky" />
      <StatCard label="Awaiting payment" value={pending.count ?? 0} icon={Clock} tone="amber" href="/hq/deposits?status=pending" />
      <StatCard label="Failed / expired · 7 days" value={failed.count ?? 0} icon={XCircle} tone="rose" href="/hq/deposits?status=failed" />
    </div>
  );
}

async function StatusTabs({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const active = params.status ?? "all";
  return (
    <Tabs
      tabs={[
        { label: "All", href: href({ q: params.q }), active: active === "all" },
        ...STATUSES.map((s) => ({
          label: s.charAt(0).toUpperCase() + s.slice(1),
          href: href({ status: s, q: params.q }),
          active: active === s,
        })),
      ]}
    />
  );
}

async function DepositsTable({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getHqTimeContext();
  const params = await searchParams;
  const status = (STATUSES as readonly string[]).includes(params.status ?? "") ? params.status! : "all";
  const page = Math.max(1, Number(params.page) || 1);
  const q = safeSearch(params.q);

  let query = createAdminClient()
    .from("starpago_deposits")
    .select(
      "id, user_id, amount, fee_php, net_php, status, pay_method, mer_order_no, payer_mobile, created_at, paid_at, profiles(member_code, display_name, avatar_url)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`mer_order_no.ilike.%${q}%,order_no.ilike.%${q}%,payer_mobile.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) return <EmptyState title="Couldn't load deposits" text={error.message} />;
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) return <EmptyState icon={ArrowDownToLine} title="No deposits found" />;

  return (
    <>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead className={table.head}>
            <tr>
              <th className={table.th}>Member</th>
              <th className={`${table.th} text-right`}>Amount</th>
              <th className={`${table.th} text-right`}>Fee</th>
              <th className={table.th}>Method</th>
              <th className={table.th}>Order</th>
              <th className={table.th}>Status</th>
              <th className={table.th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={table.row}>
                <td className={table.td}>
                  <MemberCell name={r.profiles?.display_name} code={r.profiles?.member_code} avatar={r.profiles?.avatar_url} href={`/hq/members/${r.user_id}`} />
                </td>
                <td className={`${table.td} text-right font-semibold text-white tabular-nums`}>{php(r.amount)}</td>
                <td className={`${table.td} text-right text-xs text-slate-400 tabular-nums`}>{php(r.fee_php)}</td>
                <td className={`${table.td} text-xs uppercase text-slate-300`}>{r.pay_method}</td>
                <td className={`${table.td} font-mono text-[11px] text-slate-500`}>{r.mer_order_no}</td>
                <td className={table.td}><StatusBadge status={r.status} /></td>
                <td className={`${table.td} text-xs text-slate-400`} title={dateTime(r.created_at)}>{t.relative(r.created_at)}</td>
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
                <p className="font-semibold text-white tabular-nums">{php(r.amount)}</p>
                <StatusBadge status={r.status} />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              <span className="uppercase">{r.pay_method}</span> · {t.relative(r.created_at)} · <span className="font-mono">{r.mer_order_no}</span>
            </p>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => href(params, p)} />
    </>
  );
}

export default function HqDepositsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader title="Deposits" description="GCash / Maya top-ups through StarPago." />
      <Suspense
        fallback={
          <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        }
      >
        <Summary />
      </Suspense>
      <Suspense fallback={<div className="mb-4 h-8" />}>
        <StatusTabs searchParams={searchParams} />
      </Suspense>
      <div className="mb-4 flex">
        <Suspense fallback={null}>
          <SearchBox placeholder="Search order number or mobile" />
        </Suspense>
      </div>
      <Card padded={false}>
        <Suspense fallback={<TableSkeleton />}>
          <DepositsTable searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}
