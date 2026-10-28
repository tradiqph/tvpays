/** Credits to the withdrawal bucket that count as member earnings (not refunds or HQ credits). */
export const WITHDRAWAL_EARNING_ENTRY_TYPES = [
  "drama_episode",
  "ad_reward",
  "daily_checkin",
  "referral_ad",
  "referral_upgrade",
  "agent_sale",
] as const;

export function formatWalletWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}
