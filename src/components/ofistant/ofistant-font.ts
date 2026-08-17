// Font khusus panel Ofistant — Onest, keluarga yang sama dengan shell admin
// (lewat next/font, self-hosted saat build; tidak menambah dependency).
// Panel chat memakai wajahnya sendiri agar terasa premium dan lebih mudah
// dibaca daripada font sistem storefront.
import { Onest } from "next/font/google";

export const ofistantFont = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
