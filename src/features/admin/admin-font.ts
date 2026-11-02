import localFont from "next/font/local";

/** Same Onest family, hosted locally so builds don't depend on Google Fonts CSS. */
export const adminFont = localFont({
  src: "../../../public/fonts/onest-variable.ttf",
  variable: "--font-admin",
  weight: "100 900",
  display: "swap",
});
