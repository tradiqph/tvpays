import { Resend } from "resend";

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.RESEND_FROM?.trim() || "TvPays <onboarding@resend.dev>";
}

/** Only withdrawal ops alerts use Resend in-app. */
function withdrawalNotifyTo(): string {
  return (
    process.env.WITHDRAWAL_NOTIFY_EMAIL?.trim() || "paytv480@gmail.com"
  );
}

async function sendWithdrawalNotifyEmail(opts: {
  subject: string;
  html: string;
}): Promise<void> {
  const resend = resendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping:", opts.subject);
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: withdrawalNotifyTo(),
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.warn("[email] send failed:", opts.subject, error.message);
    }
  } catch (e) {
    console.warn(
      "[email] send failed:",
      opts.subject,
      e instanceof Error ? e.message : e,
    );
  }
}

export type WithdrawalAdminNotifyInput = {
  withdrawalId: string;
  memberEmail: string | null;
  gross: number;
  tax: number;
  net: number;
  destinationType: string;
  destinationNumber: string;
  destinationName: string;
  autoPayoutAttempted: boolean;
};

/** Notify ops when a member submits a withdrawal (Resend — only email type we send). */
export async function emailWithdrawalAdminNotify(
  input: WithdrawalAdminNotifyInput,
): Promise<void> {
  const destLabel =
    input.destinationType === "maya" ? "Maya" : "GCash";
  const member = input.memberEmail?.trim() || "(no email on account)";

  await sendWithdrawalNotifyEmail({
    subject: `TvPays — withdrawal request ₱${input.net.toFixed(2)} net`,
    html: `
      <p>A member submitted a withdrawal request.</p>
      <ul>
        <li><strong>Withdrawal ID:</strong> ${input.withdrawalId}</li>
        <li><strong>Member email:</strong> ${member}</li>
        <li><strong>Gross:</strong> ₱${input.gross.toFixed(2)}</li>
        <li><strong>Tax:</strong> ₱${input.tax.toFixed(2)}${input.tax === 0 ? " (exempt)" : " (10%)"}</li>
        <li><strong>Net payout:</strong> ₱${input.net.toFixed(2)}</li>
        <li><strong>Destination:</strong> ${destLabel} — ${input.destinationNumber} (${input.destinationName})</li>
        <li><strong>Auto payout:</strong> ${input.autoPayoutAttempted ? "attempted (≤ auto limit)" : "HQ review (above auto limit)"}</li>
      </ul>
    `,
  });
}

/** @deprecated Resend is not used for deposit notices. */
export async function emailDepositPaid(_to: string, _amount: number) {}

/** @deprecated Resend is not used for plan notices. */
export async function emailPlanPurchased(_to: string, _planName: string) {}

/** @deprecated Use emailWithdrawalAdminNotify. */
export async function emailWithdrawalRequested(_to: string, _net: number) {}

/** @deprecated Resend is not used for member payout notices. */
export async function emailPayoutResult(
  _to: string,
  _success: boolean,
  _net: number,
) {}

/** @deprecated Resend is not used for agent application notices. */
export async function emailAgentDecision(_to: string, _approved: boolean) {}
