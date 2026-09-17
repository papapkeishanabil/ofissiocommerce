import localFont from "next/font/local";

export const storefrontFont = localFont({
  src: "../../../public/fonts/inter-latin-var.woff2",
  variable: "--font-storefront",
  display: "swap",
  weight: "100 900",
});
