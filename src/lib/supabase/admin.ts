import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin env is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const PRODUCTION_APP_ORIGIN = "https://tvpays.net";

export function appOrigin(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "production"
        ? PRODUCTION_APP_ORIGIN
        : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

export function isHqUser(user: {
  app_metadata?: Record<string, unknown>;
}): boolean {
  const role = user.app_metadata?.role;
  return role === "hq" || role === "super_admin";
}
