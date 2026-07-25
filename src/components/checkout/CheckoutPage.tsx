// src/components/checkout/CheckoutPage.tsx
// Multi-step gated checkout (Phase 2):
//   1. auth (handled by AuthModal via ui-store)
//   2. company profile completion
//   3. shipping address selection
//   4. order review
//   5. two terminal actions:
//      - "Lanjut pembayaran dummy" → Order (status waiting_payment_dummy)
//      - "Request quotation"        → Quotation (status submitted)
//
// iPaymu real + shipping API real are deferred to Phase 4 / 4B.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCartHydrated, useCartItems } from "@/hooks/use-cart";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { createOrder } from "@/lib/commerce/order-service";
import { formatIDR } from "@/types/product";
import type { Address } from "@/types/account";
import { CheckCircle2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CompanyProfileForm } from "@/components/company/CompanyProfileForm";
import { CompanyAddressForm } from "@/components/company/CompanyAddressForm";

export function CheckoutPage() {
  const router = useRouter();
  const { session, hydrated: authHydrated, isAuthenticated, isProfileComplete } = useAuth();
  const cartHydrated = useCartHydrated();
  const items = useCartItems();
  const clearCart = useCartStore((s) => s.clear);
  const openAuth = useUIStore((s) => s.openAuth);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((a, it) => a + it.estimatedPrice, 0),
    [items],
  );
  const tax = Math.round(subtotal * 0.11);
  const shippingCost = 0;
  const total = subtotal + tax + shippingCost;

  // Step 1: require auth. If not authed, open modal once on mount.
  useEffect(() => {
    if (!authHydrated) return;
    if (!isAuthenticated) {
      openAuth({ kind: "checkout" });
    }
  }, [authHydrated, isAuthenticated, openAuth]);

  if (!authHydrated || !cartHydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-200" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <ShieldCheck className="h-10 w-10 text-brand-600" />
        <h1 className="mt-3 text-lg font-bold text-ink">Login diperlukan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Silakan masuk atau daftar untuk melanjutkan checkout. Keranjang Anda
          akan tetap ada.
        </p>
        <Button
          className="mt-5"
          onClick={() => openAuth({ kind: "checkout" })}
        >
          Masuk / Daftar
        </Button>
        <ButtonLink href="/cart" variant="ghost" className="mt-2">
          Kembali ke keranjang
        </ButtonLink>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Keranjang kosong</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Tambahkan produk dulu sebelum checkout.
        </p>
        <ButtonLink href="/catalog" className="mt-5">
          Telusuri katalog
        </ButtonLink>
      </div>
    );
  }

  // Step 2: complete profile.
  if (!isProfileComplete || !session) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-8">
        <header className="mb-5">
          <Badge tone="brand">Langkah 1 dari 3</Badge>
          <h1 className="mt-2 text-2xl font-bold text-ink">
            Lengkapi profil perusahaan
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Data ini dipakai untuk faktur, quotation, dan pengiriman.
          </p>
        </header>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <CompanyProfileForm />
        </div>
      </div>
    );
  }

  // Step 3: shipping address.
  const defaultAddr = session.company.addresses.find((a) => a.isDefaultShipping);
  const effectiveAddressId =
    selectedAddressId ?? defaultAddr?.id ?? session.company.addresses[0]?.id ?? null;
  const selectedAddress = session.company.addresses.find(
    (a) => a.id === effectiveAddressId,
  );

  if (!selectedAddress) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 lg:px-8">
        <header className="mb-5">
          <Badge tone="brand">Langkah 2 dari 3</Badge>
          <h1 className="mt-2 text-2xl font-bold text-ink">
            Tambah alamat pengiriman
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Anda belum punya alamat. Tambahkan satu untuk lanjut.
          </p>
        </header>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <AddressAddInline />
        </div>
      </div>
    );
  }

  function handleDummyPayment() {
    if (!session || !selectedAddress) return;
    setSubmitting(true);
    const order = createOrder({
      companyId: session.company.id,
      userId: session.user.id,
      items,
      shippingAddressLabel: `${selectedAddress.label} — ${selectedAddress.recipientName}`,
      notes: null,
      subtotal,
      tax,
      shippingCost,
    });
    clearCart();
    setSubmitting(false);
    router.push(`/orders/${order.id}?new=1`);
  }

  function handleRequestQuote() {
    if (!session) return;
    setSubmitting(true);
    // Defer to /quote route for the dedicated confirmation page.
    setSubmitting(false);
    router.push("/quote");
  }

  // Step 4: review.
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <header className="mb-5">
        <Badge tone="brand">Langkah 3 dari 3</Badge>
        <h1 className="mt-2 text-2xl font-bold text-ink">Review pesanan</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Periksa detail lalu pilih lanjut bayar (dummy) atau ajukan quotation.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        {/* Left: items + address */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-ink">Item pesanan</h2>
            <ul className="mt-3 divide-y divide-line">
              {items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {it.productName}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {it.color} · {it.totalQty} pcs · {formatIDR(it.unitPrice)}/pcs
                    </p>
                  </div>
                  <p className="text-sm font-bold">{formatIDR(it.estimatedPrice)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Alamat pengiriman</h2>
              <ButtonLink href="/dashboard/addresses" variant="ghost" size="sm">
                Kelola alamat
              </ButtonLink>
            </div>

            {session.company.addresses.length > 1 && (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {session.company.addresses.map((a) => {
                  const active = a.id === effectiveAddressId;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAddressId(a.id)}
                      aria-pressed={active}
                      className={
                        "rounded-xl border p-3 text-left text-xs transition " +
                        (active
                          ? "border-brand-500 bg-brand-50/50 ring-2 ring-brand-100"
                          : "border-line hover:border-brand-300")
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{a.label}</span>
                        {a.isDefaultShipping && (
                          <Badge tone="brand">Utama</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-ink-muted">
                        {a.recipientName} · {a.recipientPhone}
                      </p>
                      <p className="mt-0.5 text-ink-muted">
                        {a.street}, {a.city}, {a.province} {a.postalCode}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {session.company.addresses.length === 1 && (
              <div className="mt-3 rounded-xl border border-line p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{selectedAddress.label}</span>
                  <Badge tone="brand">Utama</Badge>
                </div>
                <p className="mt-1 text-ink-muted">
                  {selectedAddress.recipientName} · {selectedAddress.recipientPhone}
                </p>
                <p className="mt-0.5 text-ink-muted">
                  {selectedAddress.street}, {selectedAddress.city},{" "}
                  {selectedAddress.province} {selectedAddress.postalCode}
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right: summary + actions */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-ink">Ringkasan</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Subtotal" value={formatIDR(subtotal)} />
              <Row label="PPN 11%" value={formatIDR(tax)} muted />
              <Row label="Ongkos kirim" value="Dihitung Phase 4B" muted italic />
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="text-sm font-semibold text-ink">Total</span>
              <span className="text-xl font-bold text-ink">{formatIDR(total)}</span>
            </div>

            <div className="mt-4 space-y-2">
              <Button
                className="w-full"
                onClick={handleDummyPayment}
                disabled={submitting}
              >
                {submitting ? "Memproses..." : "Lanjut Pembayaran (dummy)"}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleRequestQuote}
                disabled={submitting}
              >
                Request Quotation
              </Button>
            </div>

            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
              Pembayaran via iPaymu aktif di Phase 4. Tombol di atas membuat
              order dengan status <code>waiting_payment_dummy</code>.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  italic,
}: {
  label: string;
  value: string;
  muted?: boolean;
  italic?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-ink-muted" : "text-ink"}>{label}</dt>
      <dd
        className={
          (muted ? "text-ink-muted " : "font-semibold text-ink ") +
          (italic ? "italic text-xs" : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}

/** Inline address form when none exists yet (reuses CompanyAddressForm). */
function AddressAddInline() {
  return (
    <div>
      <CompanyAddressForm />
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-muted">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        Setelah ditambah, Anda akan kembali ke checkout.
      </p>
    </div>
  );
}

// Re-export for type completeness (unused but keeps tree-shaking honest).
export type { Address };
