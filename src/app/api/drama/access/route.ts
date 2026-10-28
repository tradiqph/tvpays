import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDramaAccess } from "@/lib/drama-access";
import { DRAMA_RENEWAL_OPTIONS } from "@/lib/drama-renewals";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getDramaAccess(user.id);
  return NextResponse.json({
    ...access,
    renewalOptions: DRAMA_RENEWAL_OPTIONS,
  });
}
