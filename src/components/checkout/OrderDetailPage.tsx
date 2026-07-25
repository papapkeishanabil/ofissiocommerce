// src/components/checkout/OrderDetailPage.tsx
// Client component for /orders/[id]. Reads mock store on client.

"use client";

import { use } from "react";

import { getOrder } from "@/lib/commerce/order-service";
import { OrderConfirmation } from "./OrderConfirmation";

interface OrderDetailPageProps {
  id: string;
}

export function OrderDetailPage({ id }: OrderDetailPageProps) {
  // use() to surface suspense boundary usage if needed
  void use(Promise.resolve());
  const order = getOrder(id);
  if (!order) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Order tidak ditemukan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Order mungkin dibuat di browser/device lain.
        </p>
      </div>
    );
  }
  return <OrderConfirmation order={order} />;
}
