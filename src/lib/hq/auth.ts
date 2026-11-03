import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type HqRole = "hq" | "super_admin";

export type HqSession = {
  user: User;
  role: HqRole;
  isSuper: boolean;
};

function roleOf(user: User | null): HqRole | null {
  const role = user?.app_metadata?.role;
  return role === "hq" || role === "super_admin" ? role : null;
}

/** Current HQ user or null. Roles live in app_metadata, which only the service role can write. */
export async function getHqSession(): Promise<HqSession | null> {
  // auth.getUser() checks token expiry with Date.now(). Cookies alone don't make
  // a render request-time under Cache Components, so opt in explicitly first.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = roleOf(user);
  if (!user || !role) return null;
  return { user, role, isSuper: role === "super_admin" };
}

/** For pages: redirects non-HQ users to login (middleware also guards /hq). */
export async function requireHq(): Promise<HqSession> {
  const session = await getHqSession();
  if (!session) redirect("/login?next=/hq");
  return session;
}

export async function requireSuperAdmin(): Promise<HqSession> {
  const session = await requireHq();
  if (!session.isSuper) redirect("/hq?denied=1");
  return session;
}
