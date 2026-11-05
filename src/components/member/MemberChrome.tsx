"use client";

import { TelegramOfficialPopup } from "@/components/member/TelegramOfficialPopup";

/** Member-only overlays (popups) mounted once for all tabs. */
export function MemberChrome() {
  return <TelegramOfficialPopup />;
}
