// src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";

import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

// Fonts aligned with the Ofissio Workwear homepage reference:
//   Headlines: Manrope (geometric, bold, premium)
//   Body / UI: Inter Variable
// Both self-hosted via next/font (no runtime external request, no CLS).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display-font",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ofissio — Conversational B2B Commerce",
    template: "%s · Ofissio",
  },
  description:
    "Platform conversational commerce B2B untuk pengadaan seragam kerja perusahaan. Dibantu Ofistant, asisten pengadaan digital.",
  applicationName: "Ofissio",
  authors: [{ name: "Ofissio" }],
  keywords: [
    "seragam kerja",
    "uniform B2B",
    "wearpack",
    "kemeja lapangan",
    "rompi safety",
    "pengadaan perusahaan",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f4fe8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
