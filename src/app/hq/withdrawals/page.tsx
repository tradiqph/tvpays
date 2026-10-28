import { createAdminClient } from "@/lib/supabase/admin";
import { WithdrawalRowActions } from "@/components/hq/WithdrawalRowActions";

export default async function HqWithdrawalsPage() {
  let rows: {
    id: string;
    status: string;
    gross_amount: number;
    net_amount: number;
    destination_type: string;
    destination_number: string;
    requested_at: string;
    paymongo_transfer_id: string | null;
    profiles: { member_code: string; display_name: string | null } | null;
  }[] = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("withdrawals")
      .select(
        "id, status, gross_amount, net_amount, destination_type, destination_number, requested_at, paymongo_transfer_id, profiles(member_code, display_name)",
      )
      .order("requested_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as unknown as typeof rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Withdrawals</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Member</th>
              <th className="p-3">Net</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Status</th>
              <th className="p-3">Transfer</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3">
                  {r.profiles?.display_name ?? "—"}
                  <br />
                  <span className="text-xs text-slate-500">
                    {r.profiles?.member_code}
                  </span>
                </td>
                <td className="p-3">₱{Number(r.net_amount).toFixed(2)}</td>
                <td className="p-3 text-xs">
                  {r.destination_type} {r.destination_number}
                </td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 font-mono text-xs">
                  {r.paymongo_transfer_id ?? "—"}
                </td>
                <td className="p-3">
                  {(r.status === "pending" || r.status === "processing") && (
                    <WithdrawalRowActions withdrawalId={r.id} />
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No withdrawals yet (or Supabase not configured).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
