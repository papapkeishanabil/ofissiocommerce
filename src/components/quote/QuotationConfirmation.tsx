// src/components/quote/QuotationConfirmation.tsx
"use client";

import { useSearchParams } from "next/navigation";

import type { Quotation } from "@/types/order";
import { quotationStatusLabel } from "@/types/order";
import { formatIDR } from "@/types/product";
import { CheckCircle2, FileText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

interface QuotationConfirmationProps {
  quotation: Quotation;
}

export function QuotationConfirmation({ quotation }: QuotationConfirmationProps) {
  const sp = useSearchParams();
  const isNew = sp.get("new") === "1";

  const subtotal = quotation.items.reduce((a, it) => a + it.estimatedPrice, 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 lg:px-8">
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </span>

        {isNew && (
          <Badge tone="success" className="mt-4">
            Berhasil dikirim
          </Badge>
        )}

        <h1 className="mt-3 text-2xl font-bold text-ink">
          Request quotation berhasil dikirim.
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Tim Ofissio akan meninjau kebutuhan Anda dan mengirim penawaran harga
          resmi melalui email PIC.
        </p>

        <div className="mt-6 rounded-xl border border-line bg-surface-muted p-4 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <FileText className="h-4 w-4" />
              {quotation.code}
            </span>
            <Badge tone="brand">{quotationStatusLabel(quotation.status)}</Badge>
          </div>
          <dl className="mt-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Jumlah item</dt>
              <dd className="font-semibold text-ink">{quotation.items.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Estimasi subtotal</dt>
              <dd className="font-semibold text-ink">{formatIDR(subtotal)}</dd>
            </div>
            {quotation.notes && (
              <div className="border-t border-line pt-2">
                <dt className="text-ink-muted">Catatan</dt>
                <dd className="mt-0.5 text-ink">{quotation.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/dashboard">Lihat di dashboard</ButtonLink>
          <ButtonLink href="/catalog" variant="outline">
            Lanjut belanja
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
