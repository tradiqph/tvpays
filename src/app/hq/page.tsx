import Link from "next/link";

export default function HqDashboard() {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Dashboard</h2>
      <p className="mb-6 text-slate-400">
        Process member withdrawals with PayMongo, review e-wallet deposits, and
        approve Agent applications.
      </p>
      <ul className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/hq/withdrawals", title: "Withdrawals", desc: "Pay & sync PayMongo payouts" },
          { href: "/hq/deposits", title: "Deposits", desc: "GCash / Maya top-ups" },
          { href: "/hq/agents", title: "Agents", desc: "Approve Elite Pro+ applications" },
        ].map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-sky-700"
            >
              <h3 className="font-semibold text-sky-200">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
