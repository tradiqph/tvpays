import { Suspense } from "react";
import { BadgeCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, EmptyState, MemberCell, PageHeader, StatusBadge, TableSkeleton, Tabs, table } from "@/components/hq/ui";
import { AgentActions } from "@/components/hq/actions";
import { planBySlug } from "@/lib/plans";
import { dateTime } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";

const STATUSES = ["pending", "approved", "rejected"] as const;

type Params = { status?: string };

type Row = {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  profiles: { member_code: string; display_name: string | null; avatar_url: string | null; plan_slug: string } | null;
};

async function AgentTabs({ searchParams }: { searchParams: Promise<Params> }) {
  const { status = "pending" } = await searchParams;
  const admin = createAdminClient();
  const counts = await Promise.all(
    STATUSES.map((s) => admin.from("agent_applications").select("id", { count: "exact", head: true }).eq("status", s)),
  );
  return (
    <Tabs
      tabs={STATUSES.map((s, i) => ({
        label: s.charAt(0).toUpperCase() + s.slice(1),
        href: s === "pending" ? "/hq/agents" : `/hq/agents?status=${s}`,
        active: status === s,
        count: counts[i].count ?? 0,
      }))}
    />
  );
}

async function AgentsTable({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getHqTimeContext();
  const { status = "pending" } = await searchParams;
  const { data, error } = await createAdminClient()
    .from("agent_applications")
    .select("id, user_id, status, created_at, reviewed_at, profiles(member_code, display_name, avatar_url, plan_slug)")
    .eq("status", STATUSES.includes(status as (typeof STATUSES)[number]) ? status : "pending")
    .order("created_at", { ascending: status === "pending" })
    .limit(200);
  if (error) return <EmptyState title="Couldn't load applications" text={error.message} />;
  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) {
    return <EmptyState icon={BadgeCheck} title={status === "pending" ? "No applications waiting" : "Nothing here yet"} />;
  }
  const name = (r: Row) => r.profiles?.display_name || `TVP${r.profiles?.member_code ?? ""}`;

  return (
    <>
      <div className={table.wrap}>
        <table className={table.table}>
          <thead className={table.head}>
            <tr>
              <th className={table.th}>Member</th>
              <th className={table.th}>Plan</th>
              <th className={table.th}>Applied</th>
              <th className={table.th}>{status === "pending" ? "Decision" : "Reviewed"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={table.row}>
                <td className={table.td}>
                  <MemberCell name={r.profiles?.display_name} code={r.profiles?.member_code} avatar={r.profiles?.avatar_url} href={`/hq/members/${r.user_id}`} />
                </td>
                <td className={table.td}>{planBySlug(r.profiles?.plan_slug ?? "")?.name ?? r.profiles?.plan_slug}</td>
                <td className={`${table.td} text-xs text-slate-400`} title={dateTime(r.created_at)}>{t.relative(r.created_at)}</td>
                <td className={table.td}>
                  {r.status === "pending" ? (
                    <AgentActions userId={r.user_id} name={name(r)} />
                  ) : (
                    <span className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-slate-500">{dateTime(r.reviewed_at)}</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={table.list}>
        {rows.map((r) => (
          <li key={r.id} className={table.item}>
            <div className="flex items-center justify-between gap-3">
              <MemberCell name={r.profiles?.display_name} code={r.profiles?.member_code} avatar={r.profiles?.avatar_url} href={`/hq/members/${r.user_id}`} />
              <span className="text-xs text-slate-500">{t.relative(r.created_at)}</span>
            </div>
            <p className="text-xs text-slate-400">Plan: {planBySlug(r.profiles?.plan_slug ?? "")?.name ?? r.profiles?.plan_slug}</p>
            {r.status === "pending" ? <AgentActions userId={r.user_id} name={name(r)} /> : <StatusBadge status={r.status} />}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function HqAgentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader title="Agent applications" description="Approve or reject members applying for the Agent program." />
      <Suspense fallback={<div className="mb-4 h-8" />}>
        <AgentTabs searchParams={searchParams} />
      </Suspense>
      <Card padded={false}>
        <Suspense fallback={<TableSkeleton />}>
          <AgentsTable searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}
