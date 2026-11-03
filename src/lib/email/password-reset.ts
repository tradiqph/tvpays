import { createClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/admin";

/** Password reset via Supabase Auth email (Dashboard SMTP), not in-app Resend. */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${appOrigin()}/reset-password` },
  );

  if (error) {
    throw new Error(error.message);
  }
}
