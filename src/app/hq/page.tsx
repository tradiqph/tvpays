import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Users,
  UserPlus,
  Wallet,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BarChart,
  Card,
  EmptyState,
  MemberCell,
  PageHeader,
  Skeleton,
  StatCard,
} from "@/components/hq/ui";
import { humanize, manilaDay, php, phpCompact } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";
import {
  applyHiddenWithdrawalLedgerExclusion,
  fetchHiddenWithdrawalIds,
} from "@/lib/wallet-ledger-visibility";
import { WITHDRAWAL_LIST_VISIBLE } from "@/lib/withdrawals";

type Profileish = { member_code: string; display_name: string | null; avatar_url: string | null } | null;

async function loadDashboard() {
  const t = await getHqTimeContext();
  const admin = createAdminClient();
  const since14 = t.daysAgoIso(14);
  const since7 = t.daysAgoIso(7);
  const hiddenWithdrawalIds = await fetchHiddenWithdrawalIds(admin);

  let ledgerQuery = admin
    .from("wallet_ledger")
    .select("id, amount, entry_type, bucket, created_at, user_id, profiles(member_code, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(8);
  ledgerQuery = applyHiddenWithdrawalLedgerExclusion(ledgerQuery, hiddenWithdrawalIds);

  const [members, newMembers, signups, deposits, pendingW, processingW, agents, wallets, ledger, queue] =
    await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7),
      admin.from("profiles").select("created_at").gte("created_at", since14).limit(20000),
      admin.from("starpago_deposits").select("amount, paid_at").eq("status", "paid").gte("paid_at", since14).limit(20000),
      admin
        .from("withdrawals")
        .select("net_amount")
        .eq("status", "pending")
        .eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE)
        .limit(5000),
      admin
        .from("withdrawals")
        .select("id", { count: "exact", head: true })
        .eq("status", "processing")
        .eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE),
      admin.from("agent_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("wallets").select("deposit_balance, withdrawal_balance").limit(50000),
      ledgerQuery,
      admin
        .from("withdrawals")
        .select("id, net_amount, requested_at, user_id, profiles(member_code, display_name, avatar_url)")
        .eq("status", "pending")
        .eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE)
        .order("requested_at", { ascending: true })
        .limit(5),
    ]);

  const days = t.lastNDays(14);
  const signupBy = new Map(days.map((d) => [d.key, 0]));
  for (const r of signups.data ?? []) {
    const k = manilaDay(r.created_at);
    if (signupBy.has(k)) signupBy.set(k, signupBy.get(k)! + 1);
  }
  const depositBy = new Map(days.map((d) => [d.key, 0]));
  for (const r of deposits.data ?? []) {
    if (!r.paid_at) continue;
    const k = manilaDay(r.paid_at);
    if (depositBy.has(k)) depositBy.set(k, depositBy.get(k)! + Number(r.amount));
  }

  const deposits7 = (deposits.data ?? [])
    .filter((r) => r.paid_at && r.paid_at >= since7)
    .reduce((s, r) => s + Number(r.amount), 0);
  const pendingSum = (pendingW.data ?? []).reduce((s, r) => s + Number(r.net_amount), 0);
  const held = (wallets.data ?? []).reduce(
    (s, w) => ({ deposit: s.deposit + Number(w.deposit_balance), withdrawable: s.withdrawable + Number(w.withdrawal_balance) }),
    { deposit: 0, withdrawable: 0 },
  );

  return {
    members: members.count ?? 0,
    newMembers: newMembers.count ?? 0,
    deposits7,
    pendingCount: pendingW.data?.length ?? 0,
    pendingSum,
    processing: processingW.count ?? 0,
    agents: agents.count ?? 0,
    held,
    signupChart: days.map((d) => ({ label: d.label, value: signupBy.get(d.key) ?? 0 })),
    depositChart: days.map((d) => ({ label: d.label, value: depositBy.get(d.key) ?? 0 })),
    ledger: (ledger.data ?? []) as unknown as {
      id: string;
      amount: number;
      entry_type: string;
      bucket: string;
      created_at: string;
      user_id: string;
      profiles: Profileish;
    }[],
    queue: (queue.data ?? []) as unknown as {
      id: string;
      net_amount: number;
      requested_at: string;
      user_id: string;
      profiles: Profileish;
    }[],
    relative: t.relative,
  };
}

async function Dashboard() {
  let d: Awaited<ReturnType<typeof loadDashboard>>;
  try {
    d = await loadDashboard();
  } catch (e) {
    return (
      <Card>
        <EmptyState title="Couldn't load the dashboard" text={e instanceof Error ? e.message : "Check the Supabase configuration."} />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Members" value={d.members.toLocaleString()} hint={`+${d.newMembers} in 7 days`} icon={Users} href="/hq/members" />
        <StatCard
          label="Pending payouts"
          value={d.pendingCount}
          hint={`${php(d.pendingSum)} · ${d.processing} processing`}
          icon={Banknote}
          tone="amber"
          href="/hq/withdrawals"
        />
        <StatCard label="Deposits (7 days)" value={phpCompact(d.deposits7)} hint={php(d.deposits7)} icon={ArrowDownToLine} tone="emerald" href="/hq/deposits?status=paid" />
        <StatCard
          label="Member balances"
          value={phpCompact(d.held.withdrawable)}
          hint={`Withdrawable · ${phpCompact(d.held.deposit)} deposits`}
          icon={Wallet}
          tone="violet"
          href="/hq/transactions"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="New members · 14 days" action={<span className="text-xs text-slate-500 tabular-nums">{d.signupChart.reduce((s, x) => s + x.value, 0)} total</span>}>
          <BarChart data={d.signupChart} />
        </Card>
        <Card title="Deposits paid · 14 days" action={<span className="text-xs text-slate-500 tabular-nums">{php(d.depositChart.reduce((s, x) => s + x.value, 0))}</span>}>
          <BarChart data={d.depositChart} format={php} tone="emerald" />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card
          className="lg:col-span-2"
          title="Needs attention"
          action={
            <Link href="/hq/withdrawals" className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200">
              All payouts <ArrowRight className="h-3 w-3" />
            </Link>
          }
          padded={false}
        >
          {d.agents > 0 && (
            <Link
              href="/hq/agents"
              className="flex items-center gap-3 border-b border-white/[0.05] bg-amber-400/[0.04] px-4 py-3 text-sm hover:bg-amber-400/[0.08]"
            >
              <BadgeCheck className="h-4 w-4 text-amber-300" />
              <span className="flex-1 text-slate-200">
                {d.agents} agent application{d.agents === 1 ? "" : "s"} waiting
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
            </Link>
          )}
          {d.queue.length === 0 ? (
            <EmptyState icon={Banknote} title="All caught up" text="No withdrawals are waiting for review." />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {d.queue.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <MemberCell
                    name={w.profiles?.display_name}
                    code={w.profiles?.member_code}
                    avatar={w.profiles?.avatar_url}
                    href={`/hq/members/${w.user_id}`}
                  />
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white tabular-nums">{php(w.net_amount)}</p>
                    <p className="text-[11px] text-amber-300/80">waiting {d.relative(w.requested_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          className="lg:col-span-3"
          title="Latest wallet activity"
          action={
            <Link href="/hq/transactions" className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200">
              All transactions <ArrowRight className="h-3 w-3" />
            </Link>
          }
          padded={false}
        >
          {d.ledger.length === 0 ? (
            <EmptyState icon={UserPlus} title="No activity yet" />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {d.ledger.map((l) => {
                const amt = Number(l.amount);
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <MemberCell
                      name={l.profiles?.display_name}
                      code={l.profiles?.member_code}
                      avatar={l.profiles?.avatar_url}
                      href={`/hq/members/${l.user_id}`}
                    />
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold tabular-nums ${amt >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {amt >= 0 ? "+" : "−"}
                        {php(Math.abs(amt))}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {humanize(l.entry_type)} · {d.relative(l.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

async function Greeting({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  if (!denied) return null;
  return (
    <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
      That page is for super admins only.
    </p>
  );
}

export default function HqDashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  return (
    <>
      <PageHeader title="Dashboard" description="Today's queue, money movement and growth at a glance." />
      <Suspense fallback={null}>
        <Greeting searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
