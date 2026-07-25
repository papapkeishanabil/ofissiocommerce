// src/app/quotes/[id]/page.tsx

import type { Metadata } from "next";

import { QuotationDetailPage } from "@/components/quote/QuotationDetailPage";

export const metadata: Metadata = { title: "Detail Quotation" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <QuotationDetailPage id={id} />;
}
