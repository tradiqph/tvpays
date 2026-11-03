export function paymongoPayoutSecretKey(): string | undefined {
  return (
    process.env.PAYMONGO_PAYOUT_SECRET_KEY?.trim() ||
    process.env.PAYMONGO_SECRET_KEY?.trim() ||
    undefined
  );
}

export function paymongoWebhookSecret(): string | undefined {
  return (
    process.env.PAYMONGO_PAYOUT_WEBHOOK_SECRET?.trim() ||
    process.env.PAYMONGO_WEBHOOK_SECRET?.trim() ||
    undefined
  );
}
