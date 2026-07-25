// src/app/cart/page.tsx

import type { Metadata } from "next";

import { CartPage } from "@/components/cart/CartPage";

export const metadata: Metadata = {
  title: "Keranjang",
  description: "Tinjau produk yang Anda pilih.",
};

export default function Page() {
  return <CartPage />;
}
