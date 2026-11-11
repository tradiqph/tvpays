import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Card, EmptyState, MemberCell, PageHeader, Pagination, TableSkeleton, table } from "@/components/hq/ui";
import { FilterSelect, SearchBox } from "@/components/hq/controls";
import { fetchHqMembersList, type MembersListSort } from "@/lib/hq/members-list";
import { SUBSCRIPTION_PLANS, planBySlug } from "@/lib/plans";
import { dateTime, php } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";
import { getStaffUserIds, isStaffUserId } from "@/lib/hq/users";

const PAGE_SIZE = 25;

const SORT_OPTIONS = [
  { value: "joined_desc", label: "Newest joined" },
  { value: "joined_asc", label: "Oldest joined" },
  { value: "withdraw_desc", label: "Withdrawable (high → low)" },
  { value: "withdraw_asc", label: "Withdrawable (low → high)" },
  { value: "deposit_desc", label: "Deposit (high → low)" },
  { value: "deposit_asc", label: "Deposit (low → high)" },
] as const;

const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((o) => o.value));

type Params = { q?: string; plan?: string; page?: string; sort?: string };

function parseSort(raw: string | undefined): MembersListSort {
  if (raw && SORT_VALUES.has(raw)) return raw as MembersListSort;
  return "joined_desc";
}

function hrefWith(params: Params, page: number) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.plan) sp.set("plan", params.plan);
  if (params.sort && params.sort !== "joined_desc") sp.set("sort", params.sort);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return `/hq/members${qs ? `?${qs}` : ""}`;
}

async function MembersTable({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getHqTimeContext();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const sort = parseSort(params.sort);

  const [{ rows, count, error }, staffIds] = await Promise.all([
    fetchHqMembersList({
      page,
      pageSize: PAGE_SIZE,
      q: params.q ?? "",
      plan: params.plan,
      sort,
    }),
    getStaffUserIds(),
  ]);
  if (error) return <EmptyState title="Couldn't load members" text={error} />;
  if (!rows.length) {
    return (
      <EmptyState
        icon={Users}
        title="No members found"
        text={params.q ? "Try a different search." : undefined}
      />
    );
  }

  return (
    <>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead className={table.head}>
            <tr>
              <th className={table.th}>Member</th>
              <th className={table.th}>Plan</th>
              <th className={`${table.th} text-right`}>Withdrawable</th>
              <th className={`${table.th} text-right`}>Deposit</th>
              <th className={table.th}>Joined</th>
              <th className={table.th} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={table.row}>
                <td className={table.td}>
                  <MemberCell name={r.display_name} code={r.member_code} avatar={r.avatar_url} href={`/hq/members/${r.id}`} />
                </td>
                <td className={table.td}>{planBySlug(r.plan_slug)?.name ?? r.plan_slug}</td>
                <td className={`${table.td} text-right tabular-nums`}>
                  {isStaffUserId(r.id, staffIds) ? "—" : php(r.wallets.withdrawal_balance)}
                </td>
                <td className={`${table.td} text-right tabular-nums text-slate-400`}>
                  {isStaffUserId(r.id, staffIds) ? "—" : php(r.wallets.deposit_balance)}
                </td>
                <td className={`${table.td} text-xs text-slate-400`} title={dateTime(r.created_at)}>
                  {t.relative(r.created_at)}
                </td>
                <td className={`${table.td} text-right`}>
                  <Link href={`/hq/members/${r.id}`} className="text-xs font-semibold text-sky-300 hover:text-sky-200">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={table.list}>
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/hq/members/${r.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.03]">
              <span className="min-w-0 flex-1">
                <MemberCell name={r.display_name} code={r.member_code} avatar={r.avatar_url} />
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold text-white tabular-nums">
                  {isStaffUserId(r.id, staffIds) ? "—" : php(r.wallets.withdrawal_balance)}
                </span>
                <span className="block text-[11px] text-slate-500">{planBySlug(r.plan_slug)?.name ?? r.plan_slug}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={count}
        hrefFor={(p) => hrefWith({ ...params, sort }, p)}
        showWhenSinglePage
      />
    </>
  );
}

export default function MembersPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader title="Members" description="Search accounts, check balances and open a member's full history." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Suspense fallback={null}>
          <SearchBox placeholder="Search name, member ID or referral code" />
          <FilterSelect
            param="plan"
            label="All plans"
            options={[...SUBSCRIPTION_PLANS].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({ value: p.slug, label: p.name }))}
          />
          <FilterSelect
            param="sort"
            label="Sort by"
            defaultValue="joined_desc"
            options={[...SORT_OPTIONS]}
          />
        </Suspense>
      </div>
      <Card padded={false}>
        <Suspense fallback={<TableSkeleton />}>
          <MembersTable searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}
