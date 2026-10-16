// src/app/orders/[id]/page.tsx

import type { Metadata } from "next";

import { OrderTrackingPage } from "@/features/tracking/OrderTrackingPage";
import { AccountLayout } from "@/features/dashboard/components/AccountLayout";

export const metadata: Metadata = { title: "Detail Order" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <AccountLayout active="orders"><OrderTrackingPage id={id} /></AccountLayout>;
}
