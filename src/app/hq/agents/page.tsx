import { createAdminClient } from "@/lib/supabase/admin";
import { AgentRowActions } from "@/components/hq/AgentRowActions";

export default async function HqAgentsPage() {
  let rows: {
    user_id: string;
    created_at: string;
    profiles: {
      member_code: string;
      display_name: string | null;
      plan_slug: string;
    } | null;
  }[] = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("agent_applications")
      .select(
        "user_id, created_at, profiles(member_code, display_name, plan_slug)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    rows = (data ?? []) as unknown as typeof rows;
  } catch {
    rows = [];
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Agent applications</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3">Member</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Applied</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-t border-slate-800">
                <td className="p-3">
                  {r.profiles?.display_name ?? "—"}
                  <br />
                  <span className="text-xs text-slate-500">
                    {r.profiles?.member_code}
                  </span>
                </td>
                <td className="p-3">{r.profiles?.plan_slug}</td>
                <td className="p-3 text-xs">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  <AgentRowActions userId={r.user_id} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No pending applications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
