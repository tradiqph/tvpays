import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MIN_WITHDRAWAL_PHP, WITHDRAWAL_TAX_RATE } from "@/lib/plans";
import { walletApply, getWallet } from "@/lib/wallet";
import { emailWithdrawalRequested } from "@/lib/email";

const BIC: Record<string, string> = {
  gcash: "GXCHPHM2XXX",
  maya: "MYYAPHM2XXX",
  bank: "PAEYPHM2XXX",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    amount?: number;
    destination_type?: string;
    destination_number?: string;
    destination_name?: string;
    destination_bic?: string;
  };

  const gross = Number(body.amount);
  if (!Number.isFinite(gross) || gross < MIN_WITHDRAWAL_PHP) {
    return NextResponse.json(
      { error: `Minimum withdrawal is ₱${MIN_WITHDRAWAL_PHP}` },
      { status: 400 },
    );
  }

  const destType = String(body.destination_type ?? "gcash").toLowerCase();
  const destNumber = String(body.destination_number ?? "").trim();
  const destName = String(body.destination_name ?? "").trim();
  if (!destNumber || !destName) {
    return NextResponse.json(
      { error: "Destination account required" },
      { status: 400 },
    );
  }

  const wallet = await getWallet(user.id);
  if (wallet.withdrawal < gross) {
    return NextResponse.json(
      { error: "Insufficient withdrawal balance" },
      { status: 400 },
    );
  }

  const tax = Math.round(gross * WITHDRAWAL_TAX_RATE * 100) / 100;
  const net = Math.round((gross - tax) * 100) / 100;

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("withdrawals")
    .insert({
      user_id: user.id,
      gross_amount: gross,
      tax_amount: tax,
      net_amount: net,
      status: "pending",
      destination_type: destType,
      destination_number: destNumber,
      destination_name: destName,
      destination_bic: body.destination_bic?.trim() || BIC[destType] || BIC.bank,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await walletApply(
      user.id,
      "withdrawal",
      -gross,
      "withdrawal_request",
      row.id,
    );
  } catch {
    await admin.from("withdrawals").delete().eq("id", row.id);
    return NextResponse.json({ error: "Could not reserve balance" }, { status: 500 });
  }

  if (user.email) {
    await emailWithdrawalRequested(user.email, net);
  }

  return NextResponse.json({ id: row.id, net_amount: net });
}
