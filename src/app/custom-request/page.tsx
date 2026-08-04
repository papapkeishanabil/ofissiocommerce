import type { Metadata } from "next";

import { CustomRequestPage } from "@/components/quote/CustomRequestPage";

export const metadata: Metadata = {
  title: "Seragam Full Custom",
  description:
    "Ajukan desain, model, bahan, warna, pola, dan ukuran seragam khusus perusahaan Anda.",
};

export default function Page() {
  return <CustomRequestPage />;
}
