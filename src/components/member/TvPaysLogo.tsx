/* eslint-disable @next/next/no-img-element */
export function TvPaysLogo({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <img
        src="/assets/branding/tvpays-mark.png"
        alt="TvPays"
        width={36}
        height={36}
        className="h-9 w-9 object-contain drop-shadow-[0_0_8px_rgba(255,200,0,0.45)]"
      />
    );
  }

  return (
    <img
      src="/assets/branding/tvpays-logo.png"
      alt="TvPays — Watch • Click • Earn"
      width={120}
      height={54}
      className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(56,140,255,0.35)]"
    />
  );
}
