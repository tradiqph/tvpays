import type { MetadataRoute } from "next";
import { PWA } from "@/lib/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TvPays",
    short_name: "TvPays",
    description: "Watch • Click • Earn — media, wallet, and rewards on TvPays.",
    start_url: "/wallet",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA.backgroundColor,
    theme_color: PWA.themeColor,
    categories: ["entertainment", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
