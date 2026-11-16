import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { requireHq } from "@/lib/hq/auth";
import { queryStarpagoMerchantBalance, StarpagoRequestError } from "@/lib/starpago";
import {
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
} from "@/components/hq/ui";
import { php } from "@/lib/hq/format";

async function WalletBalance() {
  await requireHq();
  let data: Awaited<ReturnType<typeof queryStarpagoMerchantBalance>>;
  try {
    data = await queryStarpagoMerchantBalance();
  } catch (e) {
    const text =
      e instanceof StarpagoRequestError
        ? (e.apiMsg?.trim() || e.message)
        : e instanceof Error
          ? e.message
          : "Could not reach StarPago.";
    return (
      <Card>
        <EmptyState title="Couldn't load wallet" text={text} />
      </Card>
    );
  }

  return (
    <StatCard
      label="StarPago wallet"
      value={php(data.payoutValue)}
      icon={Wallet}
      tone="sky"
    />
  );
}

export default function HqWalletPage() {
  return (
    <>
      <PageHeader title="StarPago wallet" />
      <Suspense fallback={<Skeleton className="h-28" />}>
        <WalletBalance />
      </Suspense>
    </>
  );
}