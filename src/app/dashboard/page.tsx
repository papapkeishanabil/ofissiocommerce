// src/app/dashboard/page.tsx

import type { Metadata } from "next";

import { CustomerDashboard } from "@/features/dashboard/CustomerDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const { view } = await searchParams;
  const initialView = view === "orders" || view === "quotes" || view === "logos" ? view : "overview";
  return <CustomerDashboard initialView={initialView} />;
}
