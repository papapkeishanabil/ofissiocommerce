// src/app/orders/[id]/page.tsx

import type { Metadata } from "next";

import { OrderTrackingPage } from "@/features/tracking/OrderTrackingPage";

export const metadata: Metadata = { title: "Detail Order" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <OrderTrackingPage id={id} />;
}
