import { CheckCircle2, CircleDashed, Clapperboard, Database, Mail, Send, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Suspense } from "react";
import { Card, PageHeader, Skeleton } from "@/components/hq/ui";
import { ProviderHealthCheck } from "@/components/hq/actions";
import { enabledPlatforms, platformLabel } from "@/lib/shortdrama";
import { requireHq } from "@/lib/hq/auth";

type Integration = {
  name: string;
  purpose: string;
  icon: LucideIcon;
  vars: string[];
};

// Only reports whether each variable is set — never its value.
const INTEGRATIONS: Integration[] = [
  { name: "Supabase", purpose: "Database, auth and storage", icon: Database, vars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] },
  { name: "StarPago", purpose: "GCash / Maya deposits and withdrawals", icon: Wallet, vars: ["STARPAGO_APP_ID", "STARPAGO_APP_SECRET", "STARPAGO_API_URL"] },
  { name: "PayMongo", purpose: "Legacy payouts (unused)", icon: Send, vars: ["PAYMONGO_PAYOUT_SECRET_KEY", "PAYMONGO_WALLET_ACCOUNT_NUMBER", "PAYMONGO_WALLET_ACCOUNT_NAME", "PAYMONGO_PAYOUT_WEBHOOK_SECRET"] },
  { name: "Resend", purpose: "Withdrawal request alerts", icon: Mail, vars: ["RESEND_API_KEY", "RESEND_FROM", "WITHDRAWAL_NOTIFY_EMAIL"] },
  { name: "DramaSDK", purpose: "Drama catalog and streams", icon: Clapperboard, vars: ["DRAMASDK_SECURE_TOKEN", "DRAMASDK_PACKAGE_ID"] },
];

async function Integrations() {
  await requireHq();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {INTEGRATIONS.map((i) => {
        const missing = i.vars.filter((v) => !process.env[v]);
        const ok = missing.length === 0;
        const Icon = i.icon;
        return (
          <li key={i.name} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-400/20">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{i.name}</p>
                <p className="text-[11px] text-slate-500">{i.purpose}</p>
              </div>
              {ok ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-label="Configured" />
              ) : (
                <CircleDashed className="h-5 w-5 text-amber-400" aria-label="Incomplete" />
              )}
            </div>
            {!ok && (
              <p className="mt-2 break-words text-[11px] text-amber-300/90">
                Missing: {missing.join(", ")}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function SystemPage() {
  const providers = enabledPlatforms().map((p) => ({ key: p, label: platformLabel(p) }));
  return (
    <>
      <PageHeader
        title="System status"
        description="Integration setup and live drama-source health. Wallet credit and grant plan on member profiles require super admin."
      />
      <div className="space-y-5">
        <Card title="Integrations">
          <Suspense fallback={<Skeleton className="h-40" />}>
            <Integrations />
          </Suspense>
        </Card>
        <Card title="Drama sources">
          <ProviderHealthCheck providers={providers} />
        </Card>
      </div>
    </>
  );
}
