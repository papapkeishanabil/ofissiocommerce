// Font khusus panel Ofistant — Onest, keluarga yang sama dengan shell admin
// (lewat next/font, self-hosted saat build; tidak menambah dependency).
// Panel chat memakai wajahnya sendiri agar terasa premium dan lebih mudah
// dibaca daripada font sistem storefront.
import localFont from "next/font/local";

export const ofistantFont = localFont({
  src: "../../../public/fonts/onest-variable.ttf",
  weight: "100 900",
  display: "swap",
});
