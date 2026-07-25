// src/app/orders/[id]/page.tsx

import type { Metadata } from "next";

import { OrderDetailPage } from "@/components/checkout/OrderDetailPage";

export const metadata: Metadata = { title: "Detail Order" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetailPage id={id} />;
}
