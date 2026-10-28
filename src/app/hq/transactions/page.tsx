import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, EmptyState, MemberCell, PageHeader, Pagination, TableSkeleton, table } from "@/components/hq/ui";
import { FilterSelect } from "@/components/hq/controls";
import { dateTime, humanize, php } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";

const PAGE_SIZE = 40;

const ENTRY_TYPES = [
  "starpago_deposit",
  "deposit",
  "plan_purchase",
  "plan_purchase_refund",
  "withdrawal_request",
  "withdrawal_refund",
  "ad_reward",
  "drama_episode",
  "referral_upgrade",
  "agent_sale",
];
const BUCKETS = ["deposit", "spending", "withdrawal"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { type?: string; bucket?: string; member?: string; page?: string };

type Row = {
  id: string;
  user_id: string;
  amount: number;
  bucket: string;
  entry_type: string;
  reference_id: string | null;
  created_at: string;
  profiles: { member_code: string; display_name: string | null; avatar_url: string | null } | null;
};

function href(p: Params, page: number) {
  const sp = new URLSearchParams();
  for (const k of ["type", "bucket", "member"] as const) if (p[k]) sp.set(k, p[k]!);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return `/hq/transactions${qs ? `?${qs}` : ""}`;
}

async function Ledger({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getHqTimeContext();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  let query = createAdminClient()
    .from("wallet_ledger")
    .select("id, user_id, amount, bucket, entry_type, reference_id, created_at, profiles(member_code, display_name, avatar_url)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (params.type && ENTRY_TYPES.includes(params.type)) query = query.eq("entry_type", params.type);
  if (params.bucket && BUCKETS.includes(params.bucket)) query = query.eq("bucket", params.bucket);
  if (params.member && UUID.test(params.member)) query = query.eq("user_id", params.member);

  const { data, count, error } = await query;
  if (error) return <EmptyState title="Couldn't load transactions" text={error.message} />;
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) return <EmptyState icon={ArrowLeftRight} title="No transactions match" />;

  const amount = (n: number) => (
    <span className={`font-semibold tabular-nums ${n >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
      {n >= 0 ? "+" : "−"}
      {php(Math.abs(n))}
    </span>
  );

  return (
    <>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead className={table.head}>
            <tr>
              <th className={table.th}>Member</th>
              <th className={table.th}>Type</th>
              <th className={table.th}>Balance</th>
              <th className={`${table.th} text-right`}>Amount</th>
              <th className={table.th}>Reference</th>
              <th className={table.th}>When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={table.row}>
                <td className={table.td}>
                  <MemberCell name={r.profiles?.display_name} code={r.profiles?.member_code} avatar={r.profiles?.avatar_url} href={`/hq/members/${r.user_id}`} />
                </td>
                <td className={`${table.td} text-slate-200`}>{humanize(r.entry_type)}</td>
                <td className={`${table.td} text-xs text-slate-400`}>{humanize(r.bucket)}</td>
                <td className={`${table.td} text-right`}>{amount(Number(r.amount))}</td>
                <td className={`${table.td} max-w-[160px] truncate font-mono text-[11px] text-slate-500`} title={r.reference_id ?? ""}>
                  {r.reference_id ?? "—"}
                </td>
                <td className={`${table.td} text-xs text-slate-400`} title={dateTime(r.created_at)}>{t.relative(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={table.list}>
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <MemberCell name={r.profiles?.display_name} code={r.profiles?.member_code} avatar={r.profiles?.avatar_url} href={`/hq/members/${r.user_id}`} />
            <div className="shrink-0 text-right text-sm">
              {amount(Number(r.amount))}
              <p className="text-[11px] text-slate-500">{humanize(r.entry_type)} · {t.relative(r.created_at)}</p>
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => href(params, p)} />
    </>
  );
}

async function MemberFilterChip({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  if (!params.member || !UUID.test(params.member)) return null;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("member_code, display_name")
    .eq("id", params.member)
    .maybeSingle();
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-3 py-1 text-xs text-sky-200 ring-1 ring-sky-400/30">
      Showing {data?.display_name || `TVP${data?.member_code ?? ""}`} only
      <Link href={href({ ...params, member: undefined }, 1)} className="font-semibold text-white hover:underline">
        Clear
      </Link>
    </p>
  );
}

export default function TransactionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader title="Transactions" description="Every credit and debit across member wallets." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Suspense fallback={null}>
          <FilterSelect param="type" label="All types" options={ENTRY_TYPES.map((t) => ({ value: t, label: humanize(t) }))} />
          <FilterSelect param="bucket" label="All balances" options={BUCKETS.map((b) => ({ value: b, label: humanize(b) }))} />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <MemberFilterChip searchParams={searchParams} />
      </Suspense>
      <Card padded={false}>
        <Suspense fallback={<TableSkeleton rows={10} />}>
          <Ledger searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}
