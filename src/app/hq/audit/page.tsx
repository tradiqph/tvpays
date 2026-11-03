import { Suspense } from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, EmptyState, PageHeader, Pagination, TableSkeleton } from "@/components/hq/ui";
import { FilterSelect } from "@/components/hq/controls";
import { requireSuperAdmin } from "@/lib/hq/auth";
import type { HqAction } from "@/lib/hq/audit";
import { dateTime, humanize, php } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";

const PAGE_SIZE = 50;
const ACTIONS: HqAction[] = [
  "withdrawal.pay",
  "withdrawal.sync",
  "withdrawal.reject",
  "withdrawal.frozen_refund",
  "withdrawal.frozen_complete",
  "agent.approve",
  "agent.reject",
  "member.suspend",
  "member.reactivate",
  "member.password_reset",
  "team.grant",
  "team.revoke",
];

type Params = { action?: string; page?: string };

type Row = {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  created_at: string;
};

const TONE: Record<string, string> = {
  withdrawal: "bg-emerald-400",
  agent: "bg-amber-400",
  member: "bg-sky-400",
  team: "bg-violet-400",
};

function describe(r: Row): string {
  const d = r.details ?? {};
  const bits: string[] = [];
  if (typeof d.reason === "string") bits.push(`“${d.reason}”`);
  if (typeof d.refunded === "number") bits.push(`refunded ${php(d.refunded)}`);
  if (typeof d.email === "string") bits.push(String(d.email));
  if (typeof d.role === "string") bits.push(`→ ${humanize(String(d.role))}`);
  if (typeof d.status === "string") bits.push(`status ${d.status}`);
  return bits.join(" · ");
}

async function AuditList({ searchParams }: { searchParams: Promise<Params> }) {
  await requireSuperAdmin();
  const t = await getHqTimeContext();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  let query = createAdminClient()
    .from("hq_audit_log")
    .select("id, actor_email, action, target_type, target_id, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (params.action && ACTIONS.includes(params.action as HqAction)) query = query.eq("action", params.action);

  const { data, count, error } = await query;
  if (error) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Audit log isn't set up yet"
        text="Run the migration 20261028200000_hq_audit_log.sql in Supabase, then actions will be recorded here."
      />
    );
  }
  const rows = (data ?? []) as Row[];
  if (!rows.length) return <EmptyState icon={ScrollText} title="No actions recorded yet" />;

  return (
    <>
      <ol className="divide-y divide-white/[0.05]">
        {rows.map((r) => {
          const group = r.action.split(".")[0];
          const extra = describe(r);
          return (
            <li key={r.id} className="flex gap-3 px-4 py-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[group] ?? "bg-slate-400"}`} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-slate-200">
                  <span className="font-semibold text-white">{r.actor_email ?? "Admin"}</span>{" "}
                  <span className="text-slate-400">·</span> {humanize(r.action)}{" "}
                  {r.target_type === "member" ? (
                    <Link href={`/hq/members/${r.target_id}`} className="text-sky-300 hover:underline">
                      member
                    </Link>
                  ) : (
                    <span className="font-mono text-[11px] text-slate-500">{r.target_id.slice(0, 8)}</span>
                  )}
                </p>
                {extra && <p className="mt-0.5 truncate text-xs text-slate-400">{extra}</p>}
              </div>
              <span className="shrink-0 text-[11px] text-slate-500" title={dateTime(r.created_at)}>
                {t.relative(r.created_at)}
              </span>
            </li>
          );
        })}
      </ol>
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={count ?? 0}
        hrefFor={(p) => `/hq/audit?${new URLSearchParams({ ...(params.action ? { action: params.action } : {}), page: String(p) })}`}
      />
    </>
  );
}

export default function AuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader title="Audit log" description="Every payout, refund, approval and access change made in HQ." />
      <div className="mb-4 flex">
        <Suspense fallback={null}>
          <FilterSelect param="action" label="All actions" options={ACTIONS.map((a) => ({ value: a, label: humanize(a) }))} />
        </Suspense>
      </div>
      <Card padded={false}>
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <AuditList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}
