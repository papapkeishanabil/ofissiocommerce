"use client";

import { OrderTrackingPage } from "@/features/tracking/OrderTrackingPage";

interface OrderDetailPageProps {
  id: string;
}

export function OrderDetailPage({ id }: OrderDetailPageProps) {
  return <OrderTrackingPage id={id} />;
}
