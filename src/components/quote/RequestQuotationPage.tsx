// src/components/quote/RequestQuotationPage.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCartHydrated, useCartItems } from "@/hooks/use-cart";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import type { AuthSession } from "@/types/account";
import { formatIDR } from "@/types/product";
import { FileText, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

export function RequestQuotationPage() {
  const router = useRouter();
  const { session, hydrated: authHydrated, isAuthenticated } = useAuth();
  const cartHydrated = useCartHydrated();
  const items = useCartItems();
  const clearCart = useCartStore((s) => s.clear);
  const openAuth = useUIStore((s) => s.openAuth);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const subtotal = useMemo(
    () => items.reduce((a, it) => a + (it.finalEstimatedTotal ?? it.estimatedPrice), 0),
    [items],
  );

  useEffect(() => {
    if (!authHydrated) return;
    if (!isAuthenticated) openAuth({ kind: "request_quote" });
  }, [authHydrated, isAuthenticated, openAuth]);

  if (!authHydrated || !cartHydrated) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <ShieldCheck className="h-10 w-10 text-brand-600" />
        <h1 className="mt-3 text-lg font-bold text-ink">Login diperlukan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Request quotation memerlukan akun perusahaan. Keranjang Anda tetap aman.
        </p>
        <Button className="mt-5" onClick={() => openAuth({ kind: "request_quote" })}>
          Masuk / Daftar
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <FileText className="h-10 w-10 text-slate-300" />
        <h1 className="mt-3 text-lg font-bold text-ink">Keranjang kosong</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Tambahkan produk dulu sebelum request quotation.
        </p>
        <ButtonLink href="/catalog" className="mt-5">
          Telusuri katalog
        </ButtonLink>
      </div>
    );
  }

  async function handleSubmit() {
    if (!session || submitting) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const response = await fetch("/api/quotation/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(session),
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            selectedColor: item.color,
            sizeMatrix: item.sizes,
            customization: item.customization,
            embroideryPlacements: item.embroideryPlacements ?? [],
          })),
          customerNotes: notes.trim() || null,
          picName: session.company.picName || session.user.fullName,
          picEmail: session.company.picEmail || session.user.email,
          picWhatsapp: session.company.picWhatsapp || session.user.whatsapp,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        quotation?: QuotationRequestRecord;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.quotation) {
        throw new Error(result.message ?? "Request quotation gagal diproses.");
      }
      const notification = buildQuoteNotification(result.quotation);
      window.sessionStorage.setItem(
        quoteNotificationKey(result.quotation.id),
        JSON.stringify(notification),
      );
      clearCart();
      router.push(`/quotes/${result.quotation.id}?new=1`);
    } catch (error) {
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "Request quotation belum dapat diproses.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
      <header className="mb-5">
        <Badge tone="brand">Request Quotation</Badge>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          Ajukan quotation dari keranjang
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Tim Ofissio akan meninjau kebutuhan Anda dan mengirim penawaran harga
          resmi. Cocok untuk pesanan volume atau made-to-order.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-ink">Item yang diajukan</h2>
            <ul className="mt-3 divide-y divide-line">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {it.productName}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {it.color} · {it.totalQty} pcs
                      {it.customization ? ` · ${it.customization}` : ""}
                    </p>
                    {(it.embroideryLines?.length ?? 0) > 0 ? <p className="mt-1 text-[10px] font-semibold text-amber-800">Bordir {formatIDR(it.embroideryTotal)} · {it.embroideryLines.map((line) => line.label.replace("Bordir ", "")).join(", ")}</p> : null}
                    {(it.missingEmbroideryPricingZones?.length ?? 0) > 0 ? <p className="mt-1 text-[10px] font-semibold text-amber-800">Harga bordir perlu dikonfirmasi admin.</p> : null}
                  </div>
                  <p className="text-sm font-bold">
                    {formatIDR(it.finalEstimatedTotal ?? it.estimatedPrice)}
                  </p>
                  {it.quantityTierApplied && it.quantityTierLabel ? (
                    <p className="text-[10px] font-semibold text-brand-700">Tier harga: {it.quantityTierLabel}</p>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-3 text-right">
              <span className="text-[11px] text-ink-muted">Estimasi subtotal</span>
              <p className="text-lg font-bold text-ink">{formatIDR(subtotal)}</p>
              <p className="text-[11px] text-ink-muted">
                Harga final ditentukan tim Ofissio.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <Field
              label="Catatan untuk tim Ofissio"
              htmlFor="quote-notes"
              hint="Mis: kebutuhan deadline, bordir logo, warna khusus."
            >
              <textarea
                id="quote-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Tulis catatan tambahan..."
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </Field>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-ink">Konfirmasi</h2>
            <p className="mt-2 text-xs text-ink-muted">
              Setelah dikirim, quotation berstatus <strong>submitted</strong>.
              Notifikasi email dikirim jika provider email server sudah
              dikonfigurasi.
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => void handleSubmit()}
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? "Memproses..." : "Kirim Request Quotation"}
            </Button>
            {submitMessage && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
                {submitMessage}
              </p>
            )}
            <ButtonLink href="/cart" variant="ghost" className="mt-2 w-full">
              Kembali ke keranjang
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface QuoteEmailNotification {
  status: "sent" | "mock" | "failed" | "skipped";
  recipientEmail: string | null;
  provider: string;
  message: string;
}

function quoteNotificationKey(quotationId: string) {
  return `ofissio-quote-notification:${quotationId}`;
}

function buildQuoteNotification(
  quotation: QuotationRequestRecord,
): QuoteEmailNotification {
  const firstEmail = quotation.emailResults[0];
  if (quotation.emailStatus === "sent") {
    return {
      status: "sent",
      recipientEmail: quotation.picEmail,
      provider: firstEmail?.provider ?? "resend",
      message:
        "Request quotation tercatat dan email notifikasi berhasil dikirim.",
    };
  }
  if (quotation.emailStatus === "mocked") {
    return {
      status: "mock",
      recipientEmail: quotation.picEmail,
      provider: "mock",
      message:
        "Request quotation tercatat. Email masih mode mock, jadi belum terkirim real.",
    };
  }
  if (quotation.emailStatus === "skipped") {
    return {
      status: "skipped",
      recipientEmail: quotation.picEmail,
      provider: firstEmail?.provider ?? "mock",
      message:
        "Request quotation tercatat. Email dilewati karena konfigurasi belum lengkap.",
    };
  }
  return {
    status: "failed",
    recipientEmail: quotation.picEmail,
    provider: firstEmail?.provider ?? "mock",
    message:
      "Request quotation tercatat, tetapi notifikasi email perlu dicek oleh tim.",
  };
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
