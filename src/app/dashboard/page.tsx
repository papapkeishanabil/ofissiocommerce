// src/app/dashboard/page.tsx

import type { Metadata } from "next";

import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function Page() {
  return <CustomerDashboard />;
}
