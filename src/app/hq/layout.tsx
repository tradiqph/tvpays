import Link from "next/link";

/** HQ reads live Supabase data; do not prerender at build time. */
export const instant = false;

export default function HqLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-bold text-sky-300">TvPays HQ Console</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/hq" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/hq/withdrawals" className="hover:text-white">
              Withdrawals
            </Link>
            <Link href="/hq/deposits" className="hover:text-white">
              Deposits
            </Link>
            <Link href="/hq/agents" className="hover:text-white">
              Agents
            </Link>
            <Link href="/wallet" className="text-slate-500 hover:text-white">
              Member app
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
