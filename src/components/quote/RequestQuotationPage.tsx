// src/components/quote/RequestQuotationPage.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCartHydrated, useCartItems } from "@/hooks/use-cart";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { createQuotation } from "@/lib/commerce/order-service";
import { formatIDR } from "@/types/product";
import type { Quotation } from "@/types/order";
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
    () => items.reduce((a, it) => a + it.estimatedPrice, 0),
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
      const q = createQuotation({
        companyId: session.company.id,
        userId: session.user.id,
        items,
        notes: notes.trim() || null,
      });
      const notification = await notifyQuotationByEmail(q);
      window.sessionStorage.setItem(
        quoteNotificationKey(q.id),
        JSON.stringify(notification),
      );
      clearCart();
      router.push(`/quotes/${q.id}?new=1`);
    } finally {
      setSubmitting(false);
    }
  }

  async function notifyQuotationByEmail(quotation: Quotation) {
    try {
      const response = await fetch("/api/quotation/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: session!.company.id,
          userId: session!.user.id,
          companyName: session!.company.companyName,
          picName: session!.company.picName || session!.user.fullName,
          picEmail: session!.company.picEmail || session!.user.email,
          quotation: {
            id: quotation.id,
            code: quotation.code,
            notes: quotation.notes,
            items: quotation.items,
          },
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        notification?: QuoteEmailNotification;
        message?: string;
      };
      if (!response.ok || !result.notification) {
        throw new Error(result.message);
      }
      return result.notification;
    } catch {
      setSubmitMessage(
        "Quotation tercatat, tetapi notifikasi email belum dapat diproses.",
      );
      return {
        status: "failed" as const,
        recipientEmail: session!.company.picEmail || session!.user.email,
        provider: "mock",
        message:
          "Request quotation tercatat, tetapi notifikasi email belum dapat diproses.",
      };
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
                  </div>
                  <p className="text-sm font-bold">
                    {formatIDR(it.estimatedPrice)}
                  </p>
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
  status: "sent" | "mock" | "failed";
  recipientEmail: string;
  provider: string;
  message: string;
}

function quoteNotificationKey(quotationId: string) {
  return `ofissio-quote-notification:${quotationId}`;
}
