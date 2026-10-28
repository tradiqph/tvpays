import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, EmptyState, PageHeader, StatusBadge, TableSkeleton } from "@/components/hq/ui";
import { GrantAccessForm, StaffRowActions } from "@/components/hq/actions";
import { requireSuperAdmin } from "@/lib/hq/auth";
import { listStaff } from "@/lib/hq/users";
import { dateTime } from "@/lib/hq/format";
import { getHqTimeContext } from "@/lib/hq/now";

async function StaffList() {
  const t = await getHqTimeContext();
  const session = await requireSuperAdmin();
  let staff;
  try {
    staff = await listStaff();
  } catch (e) {
    return <EmptyState title="Couldn't load staff" text={e instanceof Error ? e.message : undefined} />;
  }
  if (!staff.length) return <EmptyState icon={ShieldCheck} title="No staff accounts" />;

  staff.sort((a, b) => String(a.app_metadata.role).localeCompare(String(b.app_metadata.role)) || (a.email ?? "").localeCompare(b.email ?? ""));

  return (
    <ul className="divide-y divide-white/[0.05]">
      {staff.map((u) => {
        const role = u.app_metadata.role as "hq" | "super_admin";
        return (
          <li key={u.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-sky-400 to-blue-700 text-sm font-bold text-white">
                {(u.email ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{u.email}</p>
                <p className="text-[11px] text-slate-500" title={dateTime(u.last_sign_in_at)}>
                  Last sign-in {t.relative(u.last_sign_in_at)}
                </p>
              </div>
              <StatusBadge status={role} label={role === "super_admin" ? "Super admin" : "HQ staff"} />
            </div>
            <StaffRowActions email={u.email ?? ""} role={role} isSelf={u.id === session.user.id} />
          </li>
        );
      })}
    </ul>
  );
}

/** Checks super admin before rendering anything, including the grant form. */
async function TeamBody() {
  await requireSuperAdmin();
  return (
    <div className="space-y-5">
      <Card title="Grant access">
        <GrantAccessForm />
      </Card>
      <Card title="Staff" padded={false}>
        <Suspense fallback={<TableSkeleton rows={3} />}>
          <StaffList />
        </Suspense>
      </Card>
    </div>
  );
}

export default function TeamPage() {
  return (
    <>
      <PageHeader title="Admin team" description="Who can open the HQ console. Super admins can manage staff and see the audit log." />
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <TeamBody />
      </Suspense>
    </>
  );
}
