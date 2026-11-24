import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { getHqSession, requireHq, requireSuperAdmin } from "@/lib/hq/auth";
import {
  hqMerchantPayoutMethodLabel,
  queryStarpagoMerchantBalance,
  starpagoPayoutNotifyOriginOk,
  StarpagoRequestError,
} from "@/lib/starpago";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  HqMerchantPayoutsSyncButton,
  HqWalletWithdrawForm,
} from "@/components/hq/HqWalletWithdrawForm";
import {
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  StatusBadge,
  table,
} from "@/components/hq/ui";
import { dateTime, php } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";

async function WalletBalance() {
  await requireHq();
  let data: Awaited<ReturnType<typeof queryStarpagoMerchantBalance>>;
  try {
    data = await queryStarpagoMerchantBalance();
  } catch (e) {
    const text =
      e instanceof StarpagoRequestError
        ? (e.apiMsg?.trim() || e.message)
        : e instanceof Error
          ? e.message
          : "Could not reach StarPago.";
    return (
      <Card>
        <EmptyState title="Couldn't load wallet" text={text} />
      </Card>
    );
  }

  return (
    <StatCard
      label="StarPago wallet"
      value={php(data.payoutValue)}
      icon={Wallet}
      tone="sky"
    />
  );
}

type PayoutRow = {
  id: string;
  amount_php: number;
  destination_type: string;
  destination_number: string;
  destination_name: string;
  status: string;
  starpago_order_no: string | null;
  failure_reason: string | null;
  created_at: string;
};

async function RecentMerchantPayouts() {
  await requireSuperAdmin();
  const t = await getHqTimeContext();
  const { data, error } = await createAdminClient()
    .from("hq_merchant_payouts")
    .select(
      "id, amount_php, destination_type, destination_number, destination_name, status, starpago_order_no, failure_reason, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return (
      <Card>
        <EmptyState
          title="Recent withdrawals unavailable"
          text="Apply migration 20261124100000_hq_merchant_payouts.sql in Supabase, then refresh."
        />
      </Card>
    );
  }

  const rows = (data ?? []) as PayoutRow[];

  return (
    <Card className="mt-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-white">Recent withdrawals</h2>
        <HqMerchantPayoutsSyncButton />
      </div>
      {!rows.length ? (
        <EmptyState title="No merchant payouts yet" text="Withdrawals from this page will appear here." />
      ) : (
        <div className={table.wrap}>
          <table className={table.table}>
            <thead className={table.head}>
              <tr>
                <th className={table.th}>Destination</th>
                <th className={`${table.th} text-right`}>Amount</th>
                <th className={table.th}>Status</th>
                <th className={table.th}>Requested</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={table.row}>
                  <td className={table.td}>
                    <span className="block text-slate-200">{r.destination_name}</span>
                    <span className="block font-mono text-[11px] text-slate-500">
                      {hqMerchantPayoutMethodLabel(r.destination_type)} · {r.destination_number}
                    </span>
                  </td>
                  <td className={`${table.td} text-right font-semibold text-white tabular-nums`}>
                    {php(r.amount_php)}
                  </td>
                  <td className={table.td}>
                    <StatusBadge status={r.status} />
                    {r.starpago_order_no && (
                      <span className="mt-1 block font-mono text-[10px] text-slate-500">
                        {r.starpago_order_no}
                      </span>
                    )}
                    {r.failure_reason && (
                      <span
                        className="mt-1 block max-w-[220px] truncate text-[11px] text-rose-300/80"
                        title={r.failure_reason}
                      >
                        {r.failure_reason}
                      </span>
                    )}
                  </td>
                  <td className={`${table.td} text-xs text-slate-400`} title={dateTime(r.created_at)}>
                    {t.relative(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

async function SuperAdminWithdrawCard() {
  await requireSuperAdmin();
  const showLocalNotifyHint = !starpagoPayoutNotifyOriginOk();
  return (
    <Card className="mt-4">
      <h2 className="mb-4 text-sm font-medium text-white">Withdraw</h2>
      <HqWalletWithdrawForm showLocalNotifyHint={showLocalNotifyHint} />
    </Card>
  );
}

async function SuperAdminWalletExtras() {
  const session = await getHqSession();
  if (!session?.isSuper) return null;

  return (
    <>
      <SuperAdminWithdrawCard />
      <RecentMerchantPayouts />
    </>
  );
}

export default function HqWalletPage() {
  return (
    <>
      <PageHeader title="StarPago wallet" />
      <Suspense fallback={<Skeleton className="h-28" />}>
        <WalletBalance />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <SuperAdminWalletExtras />
      </Suspense>
    </>
  );
}