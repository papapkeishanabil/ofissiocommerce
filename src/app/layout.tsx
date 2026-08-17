// src/app/layout.tsx

import type { Metadata, Viewport } from "next";

import { RouteAwareShell } from "@/components/shell/RouteAwareShell";
import "./globals.css";

// Storefront renders the platform system font (Segoe UI on Windows) to match the
// approved design preview exactly: the preview declares "Manrope" but ships no
// font file, so on Windows it falls through to Segoe UI — and that rendered look
// is what the brand approved. The internal admin keeps its own Manrope
// (AdminLayout → --font-admin), fully independent of this root layout. No
// next/font is wired here.

export const metadata: Metadata = {
  title: {
    default: "Ofissio — Conversational B2B Commerce",
    template: "%s · Ofissio",
  },
  description:
    "Platform conversational commerce B2B untuk pengadaan seragam kerja perusahaan. Dibantu Ofistant, asisten pengadaan digital.",
  applicationName: "Ofissio",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
    <html lang="id">
      <body>
        <RouteAwareShell>{children}</RouteAwareShell>
      </body>
    </html>
  );
}
