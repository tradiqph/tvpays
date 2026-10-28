import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { purchaseDramaRenewal } from "@/lib/economy";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { period } = (await request.json()) as { period?: string };
  if (period !== "week" && period !== "month" && period !== "year") {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  try {
    const result = await purchaseDramaRenewal(user.id, period);
    return NextResponse.json({
      dramaAccessEndsAt: result.endsAt,
      period: result.option.period,
      days: result.option.days,
      pricePhp: result.option.pricePhp,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    if (msg === "subscription_required") {
      return NextResponse.json(
        { error: "Purchase a paid plan before renewing drama access." },
        { status: 403 },
      );
    }
    if (msg.includes("insufficient") || msg.includes("balance")) {
      return NextResponse.json(
        { error: "Insufficient deposit balance." },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
