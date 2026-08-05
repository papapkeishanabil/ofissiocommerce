// src/components/quote/QuotationDetailPage.tsx
"use client";

import { useEffect, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import type {
  QuotationEventRecord,
  QuotationRequestRecord,
} from "@/features/quotation/quotation.types";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { requiresCustomerBriefApproval } from "@/features/quotation/quotation-requirement";
import type { AuthSession } from "@/types/account";
import { QuotationConfirmation } from "./QuotationConfirmation";

interface QuotationDetailPageProps {
  id: string;
}

export function QuotationDetailPage({ id }: QuotationDetailPageProps) {
  const { session, hydrated, isAuthenticated } = useAuth();
  const openAuth = useUIStore((s) => s.openAuth);
  const [quotation, setQuotation] = useState<QuotationRequestRecord | null>(null);
  const [events, setEvents] = useState<CustomerQuotationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    async function loadQuotation() {
      setLoading(true);
      try {
        const response = await fetch(`/api/quotation/${id}`, {
          cache: "no-store",
          headers: authHeaders(session!),
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          ok: boolean;
          quotation?: QuotationRequestRecord;
          events?: CustomerQuotationEvent[];
        };
        if (!response.ok || !result.ok || !result.quotation) {
          setQuotation(null);
          return;
        }
        setQuotation(result.quotation);
        setEvents(result.events ?? []);
      } catch {
        if (!controller.signal.aborted) setQuotation(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadQuotation();
    return () => controller.abort();
  }, [hydrated, id, session]);

  if (!hydrated || loading) {
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

  if (!isAuthenticated || !session) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Login diperlukan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Masuk untuk melihat quotation perusahaan Anda.
        </p>
        <Button
          className="mt-5"
          onClick={() =>
            openAuth({ kind: "request_quote", returnTo: `/quotes/${id}` })
          }
        >
          Masuk / Daftar
        </Button>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Quotation tidak ditemukan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quotation tidak ada, belum tersimpan di server foundation, atau milik company lain.
        </p>
      </div>
    );
  }
  if (requiresCustomerBriefApproval(quotation)) {
    return (
      <div className="mx-auto grid w-full max-w-lg place-items-center px-4 py-16 text-center">
        <h1 className="text-xl font-black text-ink">Brief perlu persetujuan Anda</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Sales Ofissio sudah mencatat kebutuhan Full Custom. Quotation dan harga belum diproses sampai Anda menyetujui spesifikasinya.
        </p>
        <ButtonLink className="mt-5" href={`/briefs/${quotation.id}`}>
          Periksa dan setujui brief
        </ButtonLink>
      </div>
    );
  }
  return <QuotationConfirmation quotation={quotation} events={events} />;
}

type CustomerQuotationEvent = Pick<
  QuotationEventRecord,
  "id" | "eventType" | "oldStatus" | "newStatus" | "createdAt" | "note"
>;

function authHeaders(session: AuthSession): HeadersInit {
  return {
    "x-ofissio-company-id": session.company.id,
    "x-ofissio-company-name": session.company.companyName,
    "x-ofissio-user-id": session.user.id,
    "x-ofissio-user-email": session.user.email,
    "x-ofissio-user-name": session.user.fullName,
    "x-ofissio-role": session.user.role,
  };
}
