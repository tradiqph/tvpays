import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { UnregisterLegacyServiceWorkers } from "@/components/UnregisterLegacyServiceWorkers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TvPays — Media Platform",
  description: "Watch ads, manage wallets, and subscriptions on TvPays.",
  metadataBase: new URL("https://tvpays.net"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <UnregisterLegacyServiceWorkers />
        {children}
      </body>
    </html>
  );
}
