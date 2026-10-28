import { createAdminClient, appOrigin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { passwordResetEmailHtml } from "@/lib/email/templates/password-reset";

/** Sends a recovery link via Resend (Supabase generates the secure link). */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const admin = createAdminClient();
  const redirectTo = `${appOrigin()}/reset-password`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  });

  if (error) {
    throw new Error(error.message);
  }

  const resetUrl =
    data.properties?.action_link ??
    (data as { action_link?: string }).action_link;

  if (!resetUrl) {
    throw new Error("Could not generate reset link");
  }

  await sendEmail({
    to: email.trim().toLowerCase(),
    subject: "Reset your TvPays password",
    html: passwordResetEmailHtml({ resetUrl, expiresMinutes: 60 }),
  });
}
