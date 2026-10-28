import { Suspense } from "react";
import type { Metadata } from "next";
import { HqShell } from "@/components/hq/HqShell";
import { requireHq } from "@/lib/hq/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** HQ reads live Supabase data; do not prerender at build time. */
export const instant = false;

export const metadata: Metadata = {
  title: "TvPays HQ",
  robots: { index: false, follow: false },
};

async function countPending() {
  try {
    const admin = createAdminClient();
    const [w, f, a] = await Promise.all([
      admin.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "frozen"),
      admin.from("agent_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    return { withdrawals: (w.count ?? 0) + (f.count ?? 0), agents: a.count ?? 0 };
  } catch {
    return { withdrawals: 0, agents: 0 };
  }
}

async function Shell({ children }: { children: React.ReactNode }) {
  const session = await requireHq();
  const pending = await countPending();
  return (
    <HqShell
      email={session.user.email ?? "admin"}
      role={session.role}
      userId={session.user.id}
      pendingWithdrawals={pending.withdrawals}
      pendingAgents={pending.agents}
    >
      {children}
    </HqShell>
  );
}

export default function HqLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#030a1a]">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
