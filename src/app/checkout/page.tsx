// src/app/checkout/page.tsx

import type { Metadata } from "next";

import { CheckoutPage } from "@/components/checkout/CheckoutPage";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Selesaikan pesanan seragam kerja Anda.",
};

export default function Page() {
  return <CheckoutPage />;
}
