import { Resend } from "resend";

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.RESEND_FROM?.trim() || "TvPays <onboarding@resend.dev>";
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = resendClient();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping:", opts.subject);
    return;
  }
  await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export async function emailDepositPaid(to: string, amount: number) {
  await sendEmail({
    to,
    subject: "TvPays — deposit credited",
    html: `<p>Your top-up of <strong>₱${amount.toFixed(2)}</strong> has been credited to your TvPays wallet.</p>`,
  });
}

export async function emailPlanPurchased(to: string, planName: string) {
  await sendEmail({
    to,
    subject: "TvPays — plan activated",
    html: `<p>Your <strong>${planName}</strong> subscription is now active. Displayed income figures are projections, not guaranteed earnings.</p>`,
  });
}

export async function emailWithdrawalRequested(
  to: string,
  net: number,
) {
  await sendEmail({
    to,
    subject: "TvPays — withdrawal submitted",
    html: `<p>We received your withdrawal request for <strong>₱${net.toFixed(2)}</strong> (net after tax). HQ will process it shortly.</p>`,
  });
}

export async function emailPayoutResult(
  to: string,
  success: boolean,
  net: number,
) {
  await sendEmail({
    to,
    subject: success
      ? "TvPays — withdrawal paid"
      : "TvPays — withdrawal failed",
    html: success
      ? `<p>Your withdrawal of <strong>₱${net.toFixed(2)}</strong> has been sent to your destination account.</p>`
      : `<p>Your withdrawal of <strong>₱${net.toFixed(2)}</strong> could not be completed. Contact support if you need help.</p>`,
  });
}

export async function emailAgentDecision(
  to: string,
  approved: boolean,
) {
  await sendEmail({
    to,
    subject: approved
      ? "TvPays — Agent application approved"
      : "TvPays — Agent application update",
    html: approved
      ? `<p>Congratulations — your TvPays Agent application has been <strong>approved</strong>.</p>`
      : `<p>Your TvPays Agent application was not approved at this time. You may contact support for details.</p>`,
  });
}
