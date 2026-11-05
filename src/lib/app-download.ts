/** Native Android build served from `public/`. */
export const ANDROID_APK_VERSION = "1.0.0";

export const ANDROID_APK_FILENAME = `Tvpays_v${ANDROID_APK_VERSION}.APK`;

export const ANDROID_APK_HREF =
  process.env.NEXT_PUBLIC_ANDROID_APK_URL ?? `/${ANDROID_APK_FILENAME}`;

export const ANDROID_DOWNLOAD_BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-sky-200/60 bg-gradient-to-b from-[#4fb4ff] to-[#1560e8] px-5 py-2.5 text-sm font-bold text-white";

export const ANDROID_DOWNLOAD_BUTTON_STYLE = {
  boxShadow:
    "0 0 14px rgba(56,160,255,0.5), inset 0 1px 0 rgba(255,255,255,0.5)",
} as const;

export function downloadAndroidApk() {
  if (typeof document === "undefined") return;
  const a = document.createElement("a");
  a.href = ANDROID_APK_HREF;
  a.download = ANDROID_APK_FILENAME;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
