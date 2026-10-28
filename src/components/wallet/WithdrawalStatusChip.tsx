import {
  memberWithdrawalDisplayStatus,
  memberWithdrawalStatusLabel,
  type MemberWithdrawalDisplayStatus,
} from "@/lib/withdrawals";

const CHIP: Record<
  MemberWithdrawalDisplayStatus,
  { dot: string; ring: string; text: string }
> = {
  pending: {
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
    ring: "border-amber-400/35 bg-amber-500/10",
    text: "text-amber-100",
  },
  sent: {
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    ring: "border-emerald-400/35 bg-emerald-500/10",
    text: "text-emerald-100",
  },
  failed: {
    dot: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]",
    ring: "border-rose-400/35 bg-rose-500/10",
    text: "text-rose-100",
  },
  failed_refund_pending: {
    dot: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]",
    ring: "border-orange-400/35 bg-orange-500/10",
    text: "text-orange-100",
  },
};

export function WithdrawalStatusChip({
  row,
}: {
  row: { status: string; refund_status: string };
}) {
  const display = memberWithdrawalDisplayStatus(row);
  const labels = memberWithdrawalStatusLabel(display);
  const st = CHIP[display];

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${st.ring} ${st.text}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} />
        {labels.title}
      </span>
      {labels.subtitle ? (
        <span className="text-[10px] text-slate-400">{labels.subtitle}</span>
      ) : null}
    </div>
  );
}
