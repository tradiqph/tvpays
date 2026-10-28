export type DramaRenewalPeriod = "week" | "month" | "year";

export type DramaRenewalOption = {
  period: DramaRenewalPeriod;
  label: string;
  days: number;
  pricePhp: number;
  friendlyLength: string;
};

export const DRAMA_RENEWAL_OPTIONS: DramaRenewalOption[] = [
  {
    period: "week",
    label: "Weekly",
    days: 7,
    pricePhp: 149,
    friendlyLength: "1 week",
  },
  {
    period: "month",
    label: "Monthly",
    days: 30,
    pricePhp: 499,
    friendlyLength: "1 month",
  },
  {
    period: "year",
    label: "Yearly",
    days: 365,
    pricePhp: 4999,
    friendlyLength: "1 year",
  },
];

export function renewalByPeriod(
  period: string,
): DramaRenewalOption | undefined {
  return DRAMA_RENEWAL_OPTIONS.find((o) => o.period === period);
}
