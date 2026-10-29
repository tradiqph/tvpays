import { Suspense } from "react";
import Link from "next/link";
import { ArrowDownToLine, Banknote, CalendarDays, Clock, Film, Mail, Users, Wallet } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, EmptyState, PageHeader, Skeleton, StatCard, StatusBadge } from "@/components/hq/ui";
import { MemberAdminActions } from "@/components/hq/actions";
import { MemberSelfPanel } from "@/components/hq/MemberSelfPanel";
import { getHqSession } from "@/lib/hq/auth";
import { planBySlug } from "@/lib/plans";
import { dateTime, humanize, php } from "@/lib/hq/format";
import { WITHDRAWAL_LIST_VISIBLE } from "@/lib/withdrawals";
import { getHqTimeContext } from "@/lib/hq/now";

async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const t = await getHqTimeContext();
  const { id } = await params;
  const admin = createAdminClient();
  const session = await getHqSession();

  const [profileRes, walletRes, authRes, ledgerRes, wRes, dRes, refRes, auditRes] = await Promise.all([
    admin.from("profiles").select("*").eq("id", id).maybeSingle(),
    admin.from("wallets").select("deposit_balance, spending_balance, withdrawal_balance").eq("user_id", id).maybeSingle(),
    admin.auth.admin.getUserById(id),
    admin.from("wallet_ledger").select("id, amount, bucket, entry_type, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(15),
    admin.from("withdrawals").select("id, net_amount, status, destination_type, requested_at").eq("user_id", id).eq("hidden_from_history", WITHDRAWAL_LIST_VISIBLE).order("requested_at", { ascending: false }).limit(8),
    admin.from("starpago_deposits").select("id, amount, status, pay_method, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(8),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", id),
    admin.from("hq_audit_log").select("id, action, actor_email, details, created_at").eq("target_id", id).order("created_at", { ascending: false }).limit(10),
  ]);

  const p = profileRes.data;
  if (!p) {
    return (
      <Card>
        <EmptyState title="Member not found" text="This account may have been deleted." />
      </Card>
    );
  }

  const authUser = authRes.data.user;
  const bannedUntil = authUser?.banned_until ? new Date(authUser.banned_until) : null;
  const suspended = Boolean(bannedUntil && bannedUntil.getTime() > t.now);
  const staffRole = authUser?.app_metadata?.role as string | undefined;
  const isStaff = staffRole === "hq" || staffRole === "super_admin";
  const isSelf = session?.user.id === id;
  const canManage = isSelf || !isStaff || session?.isSuper;
  const w = walletRes.data;
  let referrer: { id: string; member_code: string } | null = null;
  if (p.referred_by) {
    const { data } = await admin.from("profiles").select("id, member_code").eq("id", p.referred_by).maybeSingle();
    referrer = data;
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase public avatar
            <img src={p.avatar_url} alt="" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-sky-400/40" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-500 to-blue-800 text-2xl font-bold text-white">
              {(p.display_name || p.member_code).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-white">{p.display_name || "Unnamed member"}</h2>
              <StatusBadge status={suspended ? "suspended" : "active"} />
              {isStaff && <StatusBadge status={staffRole!} label={staffRole === "super_admin" ? "Super admin" : "HQ staff"} />}
              {p.agent_status !== "none" && <StatusBadge status={p.agent_status} label={`Agent ${p.agent_status}`} />}
            </div>
            <p className="mt-0.5 font-mono text-xs text-slate-400">TVP{p.member_code} · ref {p.referral_code}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{authUser?.email ?? "—"}</span>
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Joined {dateTime(p.created_at)}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Last sign-in {t.relative(authUser?.last_sign_in_at)}</span>
            </div>
          </div>
          {canManage && (
            <MemberAdminActions
              id={id}
              suspended={suspended}
              canReset={Boolean(authUser?.email)}
              isSuper={session?.isSuper ?? false}
              hasUpline={Boolean(p.referred_by)}
              isSelf={isSelf}
            />
          )}
        </div>
      </Card>

      {isSelf && <MemberSelfPanel />}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Withdrawable" value={php(w?.withdrawal_balance)} icon={Banknote} tone="emerald" />
        <StatCard label="Deposit balance" value={php(w?.deposit_balance)} icon={Wallet} tone="sky" />
        <StatCard label="Plan" value={planBySlug(p.plan_slug)?.name ?? p.plan_slug} hint={p.subscription_ends_at ? `Until ${dateTime(p.subscription_ends_at)}` : undefined} icon={CalendarDays} tone="amber" />
        <StatCard
          label="Video access"
          value={p.drama_access_ends_at && new Date(p.drama_access_ends_at).getTime() > t.now ? "Active" : "None"}
          hint={p.drama_access_ends_at ? `Until ${dateTime(p.drama_access_ends_at)}` : undefined}
          icon={Film}
          tone="violet"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Wallet ledger" padded={false} action={<Link href={`/hq/transactions?member=${id}`} className="text-xs text-sky-300">View all</Link>}>
          {(ledgerRes.data ?? []).length === 0 ? (
            <EmptyState icon={Wallet} title="No transactions" />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {ledgerRes.data!.map((l) => {
                const amt = Number(l.amount);
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>
                      <span className="block text-slate-200">{humanize(l.entry_type)}</span>
                      <span className="block text-[11px] text-slate-500">{humanize(l.bucket)} · {dateTime(l.created_at)}</span>
                    </span>
                    <span className={`font-semibold tabular-nums ${amt >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {amt >= 0 ? "+" : "−"}{php(Math.abs(amt))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Withdrawals" padded={false}>
            {(wRes.data ?? []).length === 0 ? (
              <EmptyState icon={Banknote} title="No withdrawals" />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {wRes.data!.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>
                      <span className="block font-semibold text-white tabular-nums">{php(r.net_amount)}</span>
                      <span className="block text-[11px] text-slate-500">{r.destination_type} · {dateTime(r.requested_at)}</span>
                    </span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Deposits" padded={false}>
            {(dRes.data ?? []).length === 0 ? (
              <EmptyState icon={ArrowDownToLine} title="No deposits" />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {dRes.data!.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span>
                      <span className="block font-semibold text-white tabular-nums">{php(r.amount)}</span>
                      <span className="block text-[11px] text-slate-500">{r.pay_method} · {dateTime(r.created_at)}</span>
                    </span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Account">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-[11px] text-slate-500">Level / XP</dt><dd className="text-slate-200">{p.level} · {p.xp} XP</dd></div>
            <div><dt className="text-[11px] text-slate-500">Ads points</dt><dd className="text-slate-200">{p.ads_points}</dd></div>
            <div>
              <dt className="text-[11px] text-slate-500">Invited by</dt>
              <dd className="text-slate-200">
                {referrer ? <Link className="text-sky-300 hover:underline" href={`/hq/members/${referrer.id}`}>TVP{referrer.member_code}</Link> : "—"}
              </dd>
            </div>
            <div><dt className="text-[11px] text-slate-500">Members invited</dt><dd className="flex items-center gap-1 text-slate-200"><Users className="h-3.5 w-3.5" />{refRes.count ?? 0}</dd></div>
            <div><dt className="text-[11px] text-slate-500">Trial ends</dt><dd className="text-slate-200">{dateTime(p.trial_ends_at)}</dd></div>
            <div><dt className="text-[11px] text-slate-500">Suspended until</dt><dd className="text-slate-200">{suspended ? dateTime(authUser!.banned_until) : "—"}</dd></div>
          </dl>
        </Card>
        <Card title="HQ history" padded={false}>
          {auditRes.error || (auditRes.data ?? []).length === 0 ? (
            <EmptyState title="No HQ actions on this member" />
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {auditRes.data!.map((a) => (
                <li key={a.id} className="px-4 py-2.5 text-sm">
                  <span className="text-slate-200">{humanize(a.action)}</span>
                  <span className="block text-[11px] text-slate-500">
                    {a.actor_email ?? "admin"} · {dateTime(a.created_at)}
                    {typeof a.details?.reason === "string" ? ` · "${a.details.reason}"` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-32" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

export default function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <PageHeader title="Member" back={{ href: "/hq/members", label: "Members" }} />
      <Suspense fallback={<DetailSkeleton />}>
        <MemberDetail params={params} />
      </Suspense>
    </>
  );
}
