// src/app/layout.tsx

import type { Metadata, Viewport } from "next";

import { RouteAwareShell } from "@/components/shell/RouteAwareShell";
import "./globals.css";

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
    <html lang="id">
      <body>
        <RouteAwareShell>{children}</RouteAwareShell>
      </body>
    </html>
  );
}
