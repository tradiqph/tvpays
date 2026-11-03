import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { humanize } from "@/lib/hq/format";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-sky-300/80 hover:text-sky-200"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {back.label}
          </Link>
        )}
        <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0d1b3d]/80 to-[#081229]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          {action}
        </header>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

const STAT_TONES = {
  sky: "from-sky-400/25 to-sky-600/5 text-sky-300 ring-sky-400/30",
  amber: "from-amber-400/25 to-amber-600/5 text-amber-300 ring-amber-400/30",
  emerald: "from-emerald-400/25 to-emerald-600/5 text-emerald-300 ring-emerald-400/30",
  violet: "from-violet-400/25 to-violet-600/5 text-violet-300 ring-violet-400/30",
  rose: "from-rose-400/25 to-rose-600/5 text-rose-300 ring-rose-400/30",
} as const;

export type StatTone = keyof typeof STAT_TONES;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "sky",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  href?: string;
}) {
  const body = (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0d1b3d]/80 to-[#081229]/80 p-4 transition-colors hover:border-sky-400/30">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b ring-1 ${STAT_TONES[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

const BADGES: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  processing: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
  completed: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  paid: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  approved: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  active: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  failed: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
  frozen: "bg-violet-400/10 text-violet-300 ring-violet-400/30",
  rejected: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
  suspended: "bg-rose-400/10 text-rose-300 ring-rose-400/30",
  expired: "bg-slate-400/10 text-slate-300 ring-slate-400/30",
  none: "bg-slate-400/10 text-slate-400 ring-slate-400/20",
  super_admin: "bg-violet-400/10 text-violet-300 ring-violet-400/30",
  hq: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
        BADGES[status] ?? BADGES.none
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? humanize(status)}
    </span>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  text,
}: {
  icon?: LucideIcon;
  title: string;
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
        <Icon className="h-5 w-5 text-slate-400" />
      </span>
      <p className="font-semibold text-slate-200">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    </div>
  );
}

export function Tabs({
  tabs,
}: {
  tabs: { label: string; href: string; active: boolean; count?: number }[];
}) {
  return (
    <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          scroll={false}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            t.active
              ? "bg-sky-500 text-white shadow-[0_0_14px_rgba(14,165,233,0.45)]"
              : "bg-white/5 text-slate-300 hover:bg-white/10"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                t.active ? "bg-white/25" : "bg-white/10 text-slate-400"
              }`}
            >
              {t.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    "flex h-8 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-xs font-medium text-slate-200 hover:bg-white/5";
  return (
    <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3 text-xs text-slate-400">
      <span className="tabular-nums">
        {from}–{to} of {total.toLocaleString()}
      </span>
      <div className="flex gap-1.5">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={btn}>
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Link>
        ) : (
          <span className={`${btn} opacity-30`}>
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </span>
        )}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className={btn}>
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className={`${btn} opacity-30`}>
            Next <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Simple responsive bar chart rendered as HTML (no chart library). */
export function BarChart({
  data,
  format = (n) => n.toLocaleString(),
  tone = "sky",
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
  tone?: "sky" | "emerald";
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const bar =
    tone === "emerald"
      ? "from-emerald-300 to-emerald-600"
      : "from-sky-300 to-blue-600";
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="flex h-36 items-end gap-1" role="img" aria-label={`Total ${format(total)}`}>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={`min-h-[2px] rounded-t-[4px] bg-gradient-to-t ${bar} opacity-80 transition-opacity group-hover:opacity-100`}
              style={{ height: `${(d.value / max) * 100}%` }}
            />
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] text-white ring-1 ring-white/10 group-hover:block">
              {d.label}: {format(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.05] ${className}`} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

export function MemberCell({
  name,
  code,
  avatar,
  href,
}: {
  name: string | null | undefined;
  code: string | null | undefined;
  avatar?: string | null;
  href?: string;
}) {
  const initial = (name || code || "?").charAt(0).toUpperCase();
  const inner = (
    <span className="flex min-w-0 items-center gap-2.5">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase public avatar
        <img src={avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-sky-500 to-blue-800 text-xs font-bold text-white">
          {initial}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium text-slate-100">{name || "Unnamed"}</span>
        <span className="block truncate font-mono text-[11px] text-slate-500">TVP{code ?? "—"}</span>
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="hover:opacity-80">
      {inner}
    </Link>
  ) : (
    inner
  );
}

/** Shared table classes so every list looks the same. */
export const table = {
  wrap: "hidden overflow-x-auto md:block",
  table: "w-full text-left text-sm",
  head: "border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-slate-500",
  th: "px-4 py-2.5 font-semibold",
  row: "border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]",
  td: "px-4 py-3 align-middle",
  /** Mobile list (cards) shown below md. */
  list: "divide-y divide-white/[0.05] md:hidden",
  item: "flex flex-col gap-2 px-4 py-3",
};
