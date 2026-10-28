import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberPackages } from "@/lib/member-packages";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getMemberPackages(user.id);
  return NextResponse.json(payload);
}
