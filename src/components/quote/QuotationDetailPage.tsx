// src/components/quote/QuotationDetailPage.tsx
"use client";

import { useEffect, useState } from "react";

import { getQuotation } from "@/lib/commerce/order-service";
import type { Quotation } from "@/types/order";
import { QuotationConfirmation } from "./QuotationConfirmation";

interface QuotationDetailPageProps {
  id: string;
}

export function QuotationDetailPage({ id }: QuotationDetailPageProps) {
  const [hydrated, setHydrated] = useState(false);
  const [quotation, setQuotation] = useState<Quotation | null>(null);

  useEffect(() => {
    setQuotation(getQuotation(id) ?? null);
    setHydrated(true);
  }, [id]);

  if (!hydrated) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <div
          className="h-28 w-full animate-pulse rounded-2xl bg-slate-100"
          role="status"
          aria-label="Memuat quotation"
        />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Quotation tidak ditemukan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quotation mungkin dibuat di browser/device lain.
        </p>
      </div>
    );
  }
  return <QuotationConfirmation quotation={quotation} />;
}
