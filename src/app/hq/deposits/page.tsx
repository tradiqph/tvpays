import { createAdminClient } from "@/lib/supabase/admin";

export default async function HqDepositsPage() {
  let rows: {
    id: string;
    amount: number;
    status: string;
    pay_method: string;
    target_bucket: string;
    created_at: string;
    profiles: { member_code: string } | null;
  }[] = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("starpago_deposits")
      .select(
        "id, amount, status, pay_method, target_bucket, created_at, profiles(member_code)",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as unknown as typeof rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">E-wallet deposits</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Member</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Bucket</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3">{r.profiles?.member_code ?? "—"}</td>
                <td className="p-3">₱{Number(r.amount).toFixed(2)}</td>
                <td className="p-3">{r.pay_method}</td>
                <td className="p-3">{r.target_bucket}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No deposits yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
