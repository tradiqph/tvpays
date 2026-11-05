/** Official community links (override via env when needed). */
export const TELEGRAM_OFFICIAL_GROUP_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_OFFICIAL_URL ??
  "https://t.me/tvpaysofficial";

export const TELEGRAM_POPUP_BANNER_PATH =
  "/assets/promotions/telegram-official-group.jpg";

export const TELEGRAM_POPUP_SESSION_KEY = "tvpays:telegram_popup_closed";

export function openTelegramOfficialGroup() {
  if (typeof window === "undefined") return;
  window.open(TELEGRAM_OFFICIAL_GROUP_URL, "_blank", "noopener,noreferrer");
}
