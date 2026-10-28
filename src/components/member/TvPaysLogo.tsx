/* eslint-disable @next/next/no-img-element */
import { BRAND } from "@/lib/branding";

type Props = {
  compact?: boolean;
  className?: string;
};

export function TvPaysLogo({ compact, className }: Props) {
  if (compact) {
    return (
      <img
        src={BRAND.mark}
        alt="TvPays"
        width={36}
        height={36}
        className={className ?? "h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(255,200,0,0.4)]"}
      />
    );
  }

  return (
    <img
      src={BRAND.logo}
      alt={BRAND.alt}
      width={168}
      height={72}
      className={
        className ??
        "h-10 w-auto max-w-[min(100%,220px)] object-contain object-left drop-shadow-[0_8px_20px_rgba(0,60,160,0.45)]"
      }
    />
  );
}
