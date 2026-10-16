// src/app/layout.tsx

import type { Metadata, Viewport } from "next";

import { RouteAwareShell } from "@/components/shell/RouteAwareShell";
import "./globals.css";

// RouteAwareShell loads the shared local Inter font for customer pages.
// AdminLayout retains its independent internal typography.

export const metadata: Metadata = {
  title: {
    default: "Ofissio: Conversational B2B Commerce",
    template: "%s, Ofissio",
  },
  description:
    "Platform conversational commerce B2B untuk pengadaan seragam kerja perusahaan. Dibantu Ofistant, asisten pengadaan digital.",
  applicationName: "Ofissio",
  icons: {
    icon: "/favicon-ofissio.svg",
    shortcut: "/favicon-ofissio.svg",
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
  themeColor: "#071c3a",
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
