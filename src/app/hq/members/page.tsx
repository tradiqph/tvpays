import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, EmptyState, MemberCell, PageHeader, Pagination, StatusBadge, TableSkeleton, table } from "@/components/hq/ui";
import { FilterSelect, SearchBox } from "@/components/hq/controls";
import { SUBSCRIPTION_PLANS, planBySlug } from "@/lib/plans";
import { isAllowedAgentStatus, isAllowedPlanSlug } from "@/lib/security/input";
import { dateTime, php, safeSearch } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";

const PAGE_SIZE = 25;

type Params = { q?: string; plan?: string; agent?: string; page?: string };

type Row = {
  id: string;
  member_code: string;
  display_name: string | null;
  avatar_url: string | null;
  plan_slug: string;
  agent_status: string;
  created_at: string;
  wallets: { deposit_balance: number; withdrawal_balance: number } | null;
};

function hrefWith(params: Params, page: number) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.plan) sp.set("plan", params.plan);
  if (params.agent) sp.set("agent", params.agent);
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return `/hq/members${qs ? `?${qs}` : ""}`;
}

async function MembersTable({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getHqTimeContext();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const q = safeSearch(params.q);

  let query = createAdminClient()
    .from("profiles")
    .select(
      "id, member_code, display_name, avatar_url, plan_slug, agent_status, created_at, wallets(deposit_balance, withdrawal_balance)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    const code = q.replace(/^tvp/i, "");
    query = query.or(`member_code.ilike.%${code}%,display_name.ilike.%${q}%,referral_code.ilike.%${q}%`);
  }
  const planSlugs = SUBSCRIPTION_PLANS.map((p) => p.slug);
  if (params.plan && isAllowedPlanSlug(params.plan, planSlugs)) {
    query = query.eq("plan_slug", params.plan);
  }
  if (params.agent && isAllowedAgentStatus(params.agent)) {
    query = query.eq("agent_status", params.agent);
  }

  const { data, count, error } = await query;
  if (error) return <EmptyState title="Couldn't load members" text={error.message} />;
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) return <EmptyState icon={Users} title="No members found" text={q ? "Try a different search." : undefined} />;

  return (
    <>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead className={table.head}>
            <tr>
              <th className={table.th}>Member</th>
              <th className={table.th}>Plan</th>
              <th className={table.th}>Agent</th>
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
                <td className={table.td}>
                  {r.agent_status !== "none" && <StatusBadge status={r.agent_status} />}
                </td>
                <td className={`${table.td} text-right tabular-nums`}>{php(r.wallets?.withdrawal_balance)}</td>
                <td className={`${table.td} text-right tabular-nums text-slate-400`}>{php(r.wallets?.deposit_balance)}</td>
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
                <span className="block text-sm font-semibold text-white tabular-nums">{php(r.wallets?.withdrawal_balance)}</span>
                <span className="block text-[11px] text-slate-500">{planBySlug(r.plan_slug)?.name ?? r.plan_slug}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => hrefWith(params, p)} />
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
            param="agent"
            label="Any agent status"
            options={[
              { value: "approved", label: "Agents" },
              { value: "pending", label: "Agent pending" },
            ]}
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
