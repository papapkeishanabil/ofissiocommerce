// src/app/quote/page.tsx

import type { Metadata } from "next";

import { RequestQuotationPage } from "@/components/quote/RequestQuotationPage";

export const metadata: Metadata = {
  title: "Request Quotation",
  description: "Ajukan quotation dari keranjang Anda.",
};

export default function Page() {
  return <RequestQuotationPage />;
}
