import type { Metadata } from "next";

import { PromotionShowcase } from "@/features/promotions/components/PromotionShowcase";

export const metadata: Metadata = {
  title: "Promo & Voucher Ofissio",
  description:
    "Penawaran aktif Ofissio. Pilih voucher untuk pesanan seragam kerja Anda.",
};

export default function PromoPage() {
  return <PromotionShowcase />;
}
