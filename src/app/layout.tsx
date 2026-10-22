// src/app/layout.tsx

import type { Metadata, Viewport } from "next";

import { RouteAwareShell } from "@/components/shell/RouteAwareShell";
import { StandaloneBoot } from "@/components/shell/StandaloneBoot";
import "./globals.css";

// RouteAwareShell loads the shared local Inter font for customer pages.
// AdminLayout retains its independent internal typography.

export const metadata: Metadata = {
  title: {
    default: "Ofissio : Seragam Professional Untuk Usaha Anda",
    template: "%s, Ofissio",
  },
  description:
    "Platform conversational commerce B2B untuk pengadaan seragam kerja perusahaan. Dibantu Ofistant, asisten pengadaan digital.",
  applicationName: "Ofissio",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-ofissio-32.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/favicon-ofissio.svg?v=2", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/favicon-ofissio-32.png?v=2",
    apple: [{ url: "/brand/app-icon-192-v1.png", sizes: "192x192", type: "image/png" }],
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
  // "only light" opts the storefront out of Chrome-for-Android's Auto Dark
  // Theme. Without it, phones with forced dark mode invert the ivory design:
  // the white header logo turns black on navy and the cream 3D viewer renders
  // near-black. The site ships a light-only palette (no dark styles exist).
  colorScheme: "only light",
  // Match the storefront header navy so the Android address bar blends in.
  themeColor: "#091629",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <StandaloneBoot />
        <RouteAwareShell>{children}</RouteAwareShell>
      </body>
    </html>
  );
}
