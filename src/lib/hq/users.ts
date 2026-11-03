import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE = 1000;
const MAX_PAGES = 20;

/** Walks auth users page by page (Supabase has no server-side filter on these). */
async function eachAuthUser(visit: (u: User) => boolean | void) {
  const admin = createAdminClient();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(error.message);
    for (const u of data.users) if (visit(u) === true) return;
    if (data.users.length < PAGE) return;
  }
}

export async function findAuthUserByEmail(email: string): Promise<User | null> {
  let found: User | null = null;
  await eachAuthUser((u) => {
    if (u.email?.toLowerCase() === email) {
      found = u;
      return true;
    }
  });
  return found;
}

export async function listStaff(): Promise<User[]> {
  const staff: User[] = [];
  await eachAuthUser((u) => {
    const role = u.app_metadata?.role;
    if (role === "hq" || role === "super_admin") staff.push(u);
  });
  return staff;
}
