import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  memberTransferWallet,
  type WalletTransferDirection,
} from "@/lib/wallet-transfer";

const DIRECTIONS: WalletTransferDirection[] = [
  "deposit_to_withdrawal",
  "withdrawal_to_deposit",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    direction?: string;
    amount?: number;
  };

  const direction = body.direction as WalletTransferDirection;
  const amount = Number(body.amount);

  if (!direction || !DIRECTIONS.includes(direction)) {
    return NextResponse.json({ error: "Invalid transfer direction" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }
  if (amount > 1_000_000) {
    return NextResponse.json({ error: "Amount is too large" }, { status: 400 });
  }

  try {
    const balances = await memberTransferWallet(user.id, direction, amount);
    return NextResponse.json({
      ok: true,
      deposit_balance: balances.deposit,
      withdrawal_balance: balances.withdrawal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transfer failed";
    if (msg === "insufficient_balance") {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
    if (msg === "invalid_amount") {
      return NextResponse.json({ error: "Minimum transfer is ₱1" }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
