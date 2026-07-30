// src/components/quote/QuotationConfirmation.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import type {
  QuotationEventRecord,
  QuotationRequestRecord,
} from "@/features/quotation/quotation.types";
import { quotationStatusLabel } from "@/features/quotation/quotation.mapper";
import { useAuth } from "@/hooks/use-auth";
import { formatIDR } from "@/types/product";
import type { AuthSession } from "@/types/account";

interface QuotationConfirmationProps {
  quotation: QuotationRequestRecord;
  events?: CustomerQuotationEvent[];
}

export function QuotationConfirmation({
  quotation: initialQuotation,
  events = [],
}: QuotationConfirmationProps) {
  const sp = useSearchParams();
  const isNew = sp.get("new") === "1";
  const { session } = useAuth();
  const [quotation, setQuotation] = useState(initialQuotation);
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [documentMessage, setDocumentMessage] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<QuoteEmailNotification | null>(null);

  useEffect(() => {
    setQuotation(initialQuotation);
  }, [initialQuotation]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(
        quoteNotificationKey(quotation.id),
      );
      if (!raw) return;
      setNotification(JSON.parse(raw) as QuoteEmailNotification);
    } catch {
      setNotification(null);
    }
  }, [quotation.id]);

  const canShowFinalPrice = ["quoted", "accepted", "converted_to_order"].includes(
    quotation.status,
  );
  const isExpired = quotation.validUntil
    ? Date.parse(quotation.validUntil) < Date.now()
    : false;
  const canAccept = quotation.status === "quoted" && !isExpired && !!quotation.grandTotal;
  const canReject = ["quoted", "under_review", "submitted", "emailed"].includes(
    quotation.status,
  );
  const reviewCopy =
    quotation.status === "submitted" ||
    quotation.status === "emailed" ||
    quotation.status === "under_review"
      ? "Sedang direview tim Ofissio. Harga final akan tampil setelah sales mengirim penawaran."
      : quotation.customerMessage ||
        "Silakan review penawaran ini. Jika sudah sesuai, Anda bisa accept quotation.";
  const isEmailIssue =
    notification?.status === "failed" || notification?.status === "skipped";

  function runCustomerAction(
    action: "accept" | "reject" | "request-revision",
    success: string,
    note?: string | null,
  ) {
    if (!session) return;
    setActionMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/quotation/${quotation.id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session),
        },
        body: JSON.stringify({ note: note ?? null }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        quotation?: QuotationRequestRecord;
      };
      if (!response.ok || !result.ok || !result.quotation) {
        setActionMessage(result.message ?? "Action quotation belum berhasil.");
        return;
      }
      setQuotation(result.quotation);
      setActionMessage(success);
    });
  }

  function downloadQuotationPdf() {
    if (!session) return;
    setDocumentMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/quotations/${quotation.id}/pdf`, {
        headers: authHeaders(session),
        cache: "no-store",
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        signedUrl?: string;
      };
      if (!response.ok || !result.ok || !result.signedUrl) {
        setDocumentMessage(result.message ?? "PDF penawaran belum tersedia.");
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      setDocumentMessage("PDF penawaran dibuka lewat signed URL sementara.");
    });
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            {isNew ? (
              <Badge
                tone={isEmailIssue ? "amber" : "success"}
              >
                {notification?.status === "sent"
                  ? "Email terkirim"
                  : isEmailIssue
                    ? "Email perlu dicek"
                    : notification?.status === "mock"
                      ? "Email mock"
                      : "Request tercatat"}
              </Badge>
            ) : null}
            <p className="mt-3 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-brand-700">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Detail quotation
            </p>
            <h1 className="mt-2 text-2xl font-black text-ink lg:text-3xl">
              {quotation.quotationNumber}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {quotation.companyName} - {quotation.totalQty} pcs - {quotation.items.length} item
            </p>
          </div>
          <Badge tone={quotation.status === "accepted" ? "success" : "brand"}>
            {quotationStatusLabel(quotation.status)}
          </Badge>
        </div>

        <div className="mt-5 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
          <p className="font-bold">{reviewCopy}</p>
          {quotation.validUntil ? (
            <p className="mt-1 text-brand-800">
              Berlaku sampai {formatDate(quotation.validUntil)}
              {isExpired ? " - sudah kedaluwarsa" : ""}.
            </p>
          ) : null}
        </div>

        {canShowFinalPrice ? (
          <dl className="mt-5 grid gap-3 text-sm md:grid-cols-5">
            <PriceCard label="Subtotal" value={quotation.subtotal ?? 0} />
            <PriceCard label="Discount" value={quotation.discountTotal} />
            <PriceCard label="Tax" value={quotation.taxTotal} />
            <PriceCard label="Ongkir estimasi" value={quotation.shippingEstimate} />
            <PriceCard label="Grand total" value={quotation.grandTotal ?? 0} strong />
          </dl>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-line bg-slate-50 p-5 text-sm text-ink-muted">
            <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
            Menunggu review sales. Sistem tidak menampilkan harga final sebelum admin/sales mengisi quotation.
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-line bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-ink">PDF Penawaran</p>
              <p className="mt-1 text-ink-muted">
                {canShowFinalPrice
                  ? "Download PDF penawaran jika dokumen final sudah dibuat tim Ofissio."
                  : "PDF penawaran akan tersedia setelah penawaran final."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!canShowFinalPrice || isPending}
              onClick={downloadQuotationPdf}
            >
              <Download className="h-4 w-4" />
              Download PDF Penawaran
            </Button>
          </div>
          {documentMessage ? (
            <p className="mt-2 font-semibold text-ink-muted" role="status">
              {documentMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!canAccept || isPending}
            onClick={() => runCustomerAction("accept", "Quotation berhasil disetujui. Tim Ofissio akan menyiapkan convert ke order.")}
          >
            Accept quotation
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canReject || isPending}
            onClick={() =>
              runCustomerAction(
                "reject",
                "Quotation ditolak. Tim sales akan melihat status ini.",
                window.prompt("Catatan penolakan untuk sales (opsional)") ?? null,
              )
            }
          >
            Reject
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isPending}
            onClick={() => {
              const note = window.prompt("Catatan revisi yang ingin diminta");
              if (note) {
                runCustomerAction("request-revision", "Request revision dikirim.", note);
              }
            }}
          >
            Request revision
          </Button>
          {quotation.convertedOrderId ? (
            <ButtonLink href={`/orders/${quotation.convertedOrderId}`} variant="secondary">
              Lihat order
            </ButtonLink>
          ) : null}
        </div>
        {actionMessage ? (
          <p className="mt-3 text-sm font-semibold text-ink-muted" role="status">
            {actionMessage}
          </p>
        ) : null}
      </section>

      <section className="mt-5 space-y-4">
        <h2 className="text-lg font-black text-ink">Item, size matrix, dan bordir</h2>
        {quotation.items.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-ink">{item.productName}</h3>
                <p className="text-sm text-ink-muted">
                  SKU {item.sku} - {item.selectedColor} - {item.totalQty} pcs
                </p>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-ink">
                model3dUrl: {item.model3dUrl}
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_280px]">
              <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-6">
                {Object.entries(item.sizeMatrix).map(([size, qty]) => (
                  <div key={size} className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-line">
                    <p className="font-black text-ink">{size}</p>
                    <p className="text-ink-muted">{qty} pcs</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-black text-ink">Bordir</p>
                {item.embroideryPlacements.length === 0 ? (
                  <p className="mt-1 text-ink-muted">Tidak ada titik bordir.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-ink-muted">
                    {item.embroideryPlacements.map((placement) => (
                      <li key={`${placement.zone}-${placement.logoFileId}`}>
                        {placement.zone} - {placement.widthCm}x{placement.heightCm} cm
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <h2 className="text-lg font-black text-ink">Quotation timeline</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">
            Timeline detail akan tampil setelah event Phase 17 tersedia.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-ink">{event.eventType}</p>
                  <span className="text-xs font-semibold text-ink-muted">
                    {formatDate(event.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-ink-muted">
                  {event.oldStatus ?? "-"} → {event.newStatus ?? "-"}
                  {event.note ? ` - ${event.note}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/dashboard">Lihat di dashboard</ButtonLink>
        <ButtonLink href="/catalog" variant="outline">
          Lanjut belanja
        </ButtonLink>
      </div>
    </main>
  );
}

interface QuoteEmailNotification {
  status: "sent" | "mock" | "failed" | "skipped";
  recipientEmail: string | null;
  provider: string;
  message: string;
}

type CustomerQuotationEvent = Pick<
  QuotationEventRecord,
  "id" | "eventType" | "oldStatus" | "newStatus" | "createdAt" | "note"
>;

function quoteNotificationKey(quotationId: string) {
  return `ofissio-quote-notification:${quotationId}`;
}

function PriceCard({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </dt>
      <dd className={strong ? "mt-1 text-lg font-black text-ink" : "mt-1 font-bold text-ink"}>
        {formatIDR(value)}
      </dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

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
