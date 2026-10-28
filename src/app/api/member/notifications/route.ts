import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberNotifications } from "@/lib/member-notifications";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await getMemberNotifications(user.id);
  return NextResponse.json({ notifications });
}
