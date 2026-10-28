import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Exo_2, Geist_Mono } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { PWA } from "@/lib/branding";
import "./globals.css";

const exo = Exo_2({
  variable: "--font-exo",
  subsets: ["latin"],
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TvPays — Media Platform",
  description: "Watch • Click • Earn — media, wallet, and rewards on TvPays.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://tvpays.net"),
  applicationName: "TvPays",
  appleWebApp: {
    capable: true,
    title: "TvPays",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: PWA.themeColor,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${exo.variable} ${chakra.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
