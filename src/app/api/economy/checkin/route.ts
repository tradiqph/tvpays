import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dailyCheckin } from "@/lib/economy";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const amount = await dailyCheckin(user.id);
    return NextResponse.json({ amount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    if (msg === "already_checked_in") {
      return NextResponse.json({ error: "Already checked in today" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
