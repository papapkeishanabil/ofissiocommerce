// src/components/quote/QuotationDetailPage.tsx
"use client";

import { use } from "react";

import { getQuotation } from "@/lib/commerce/order-service";
import { QuotationConfirmation } from "./QuotationConfirmation";

interface QuotationDetailPageProps {
  id: string;
}

export function QuotationDetailPage({ id }: QuotationDetailPageProps) {
  void use(Promise.resolve());
  const q = getQuotation(id);
  if (!q) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Quotation tidak ditemukan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quotation mungkin dibuat di browser/device lain.
        </p>
      </div>
    );
  }
  return <QuotationConfirmation quotation={q} />;
}
