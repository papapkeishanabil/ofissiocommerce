// src/components/checkout/CheckoutPage.tsx
// Multi-step gated checkout with Phase 5 payment/shipping foundation:
//   1. auth (handled by AuthModal via ui-store)
//   2. company profile completion
//   3. shipping address selection
//   4. order review
//   5. backend-priced shipping + mock/iPaymu payment boundary

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCartHydrated, useCartItems } from "@/hooks/use-cart";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { formatIDR } from "@/types/product";
import { hasCartCustomization, type CartLineItem } from "@/types/cart";
import type { Address, Company } from "@/types/account";
import type { ShippingRate } from "@/features/shipping/shipping.types";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductThumb } from "@/components/ui/ProductThumb";
import { CompanyProfileForm } from "@/components/company/CompanyProfileForm";
import { CompanyAddressForm } from "@/components/company/CompanyAddressForm";
import { CheckoutFrame } from "./CheckoutFrame";

/** Check only profile fields (excludes address). */
function isProfileFieldsComplete(c: Company): boolean {
  return (
    !!c.companyName &&
    !!c.industry &&
    c.employeeCount > 0 &&
    !!c.phone &&
    !!c.picName &&
    !!c.picEmail &&
    !!c.picWhatsapp
  );
}

export function CheckoutPage() {
  const router = useRouter();
  const { session, hydrated: authHydrated, isAuthenticated } = useAuth();
  const cartHydrated = useCartHydrated();
  const items = useCartItems();
  const clearCart = useCartStore((s) => s.clear);
  const appliedPromotion = useCartStore((s) => s.appliedPromotion);
  const openAuth = useUIStore((s) => s.openAuth);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShippingRateId, setSelectedShippingRateId] = useState<
    string | null
  >(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [backendSubtotal, setBackendSubtotal] = useState<number | null>(null);
  const [backendDiscount, setBackendDiscount] = useState<number | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const clientSubtotal = useMemo(
    () => items.reduce((a, it) => a + (it.finalEstimatedTotal ?? it.estimatedPrice), 0),
    [items],
  );
  const subtotal = backendSubtotal ?? clientSubtotal;
  const discountTotal = backendDiscount ?? (
    appliedPromotion?.subtotalAtApply === clientSubtotal
      ? appliedPromotion.discountTotal
      : 0
  );
  const netSubtotal = Math.max(0, subtotal - discountTotal);
  const tax = Math.round(netSubtotal * 0.11);
  const selectedShippingRate = shippingRates.find(
    (rate) => rate.id === selectedShippingRateId,
  );
  const shippingCost = selectedShippingRate?.price ?? 0;
  const total = netSubtotal + tax + shippingCost;
  const hasMadeToOrder = items.some(
    (item) => item.fulfillmentType === "MADE_TO_ORDER",
  );
  const requiresEmbroideryConsultation = items.some(
    hasCartCustomization,
  );

  // Step 1: require auth. If not authed, open modal once on mount.
  useEffect(() => {
    if (!authHydrated) return;
    if (!isAuthenticated) {
      openAuth({ kind: "checkout" });
    }
  }, [authHydrated, isAuthenticated, openAuth]);

  if (!authHydrated || !cartHydrated) {
    return (
      <CheckoutFrame title="Menyiapkan checkout…">
        <div className="space-y-4">
          <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-surface-muted" />
          <div className="h-72 animate-pulse rounded-2xl border border-line bg-surface-muted" />
        </div>
      </CheckoutFrame>
    );
  }

  if (!isAuthenticated) {
    return (
      <CheckoutFrame
        title="Login diperlukan"
        description="Silakan masuk atau daftar untuk melanjutkan checkout. Keranjang Anda akan tetap ada."
        centered
      >
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-soft-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Masuk atau daftar untuk melanjutkan checkout.
          </p>
          <div className="mt-6 space-y-2">
            <Button
              className="w-full"
              onClick={() => openAuth({ kind: "checkout" })}
            >
              Masuk / Daftar
            </Button>
            <ButtonLink href="/cart" variant="ghost" className="w-full">
              Kembali ke keranjang
            </ButtonLink>
          </div>
        </div>
      </CheckoutFrame>
    );
  }

  if (items.length === 0) {
    return (
      <CheckoutFrame
        title="Keranjang kosong"
        description="Tambahkan produk dulu sebelum checkout."
        centered
      >
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-soft-sm">
          <p className="text-sm leading-relaxed text-ink-muted">
            Belum ada produk di keranjang Anda.
          </p>
          <ButtonLink href="/catalog" className="mt-5 w-full sm:w-auto">
            Telusuri katalog
          </ButtonLink>
        </div>
      </CheckoutFrame>
    );
  }

  // Step 2: complete profile (fields only, not address).
  const profileFieldsComplete = session ? isProfileFieldsComplete(session.company) : false;

  if (!session || !profileFieldsComplete) {
    return (
      <CheckoutFrame
        step={1}
        title="Lengkapi profil perusahaan"
        description="Data ini dipakai untuk faktur, quotation, dan pengiriman."
        aside={
          <CondensedSummary
            items={items}
            subtotal={subtotal}
            discountTotal={discountTotal}
            tax={tax}
            total={total}
            promotionCode={appliedPromotion?.code}
          />
        }
      >
        {profileSaved && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            Profil perusahaan berhasil disimpan. Silakan lanjut ke alamat pengiriman.
          </div>
        )}

        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <CompanyProfileForm
            onSuccess={() => setProfileSaved(true)}
          />
        </div>
      </CheckoutFrame>
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
      <CheckoutFrame
        step={2}
        title="Tambah alamat pengiriman"
        description="Anda belum punya alamat. Tambahkan satu untuk lanjut."
        aside={
          <CondensedSummary
            items={items}
            subtotal={subtotal}
            discountTotal={discountTotal}
            tax={tax}
            total={total}
            promotionCode={appliedPromotion?.code}
          />
        }
      >
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <AddressAddInline />
        </div>
      </CheckoutFrame>
    );
  }

  function handlePayment() {
    if (!session || !selectedAddress) return;
    setSubmitting(true);
    void createPayment();
  }

  async function syncCartForBackend() {
    if (!session) throw new Error("Sesi checkout tidak tersedia.");
    const response = await fetch("/api/checkout/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: session.company.id,
        userId: session.user.id,
        promotionCode: appliedPromotion?.code ?? null,
        items: items.map((item) => ({
          productId: item.productId,
          selectedColor: item.color,
          sizeMatrix: item.sizes,
          customization: item.customization,
          embroideryPlacements: item.embroideryPlacements ?? [],
        })),
      }),
    });
    const result = (await response.json()) as {
      ok: boolean;
      cartId?: string;
      subtotal?: number;
      discountTotal?: number;
      message?: string;
    };
    if (!response.ok || !result.cartId) throw new Error(result.message);
    if (typeof result.subtotal === "number") {
      setBackendSubtotal(result.subtotal);
    }
    if (typeof result.discountTotal === "number") {
      setBackendDiscount(result.discountTotal);
    }
    return result.cartId;
  }

  async function handleCheckShipping() {
    if (!selectedAddress || !session) return;
    setShippingLoading(true);
    setCheckoutMessage(null);
    try {
      await syncCartForBackend();
      const response = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: session.company.id,
          userId: session.user.id,
          // The server replaces this placeholder with its configured origin.
          origin: { city: "Bandung", postalCode: "40115" },
          destination: {
            city: selectedAddress.city,
            postalCode: selectedAddress.postalCode,
          },
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.totalQty,
            // Ignored while Phase 4C has no canonical product weight.
            weightGram: 500,
          })),
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        rates?: ShippingRate[];
        message?: string;
      };
      if (!response.ok || !result.rates?.length) {
        throw new Error(result.message);
      }
      setShippingRates(result.rates);
      setSelectedShippingRateId((current) =>
        result.rates!.some((rate) => rate.id === current)
          ? current
          : result.rates![0]!.id,
      );
    } catch {
      setShippingRates([]);
      setSelectedShippingRateId(null);
      setCheckoutMessage(
        "Ongkir belum bisa dihitung otomatis. Tim Ofissio akan mengonfirmasi ongkir melalui quotation.",
      );
    } finally {
      setShippingLoading(false);
    }
  }

  async function createPayment() {
    if (!session || !selectedAddress) return;
    setCheckoutMessage(null);
    try {
      const cartId = await syncCartForBackend();
      const response = await fetch("/api/payment/ipaymu/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId,
          companyId: session.company.id,
          userId: session.user.id,
          shippingRateId: selectedShippingRateId,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        paymentUrl?: string | null;
        message?: string;
      };
      if (!response.ok || !result.ok) throw new Error(result.message);
      clearCart();
      if (result.paymentUrl) {
        router.push(result.paymentUrl);
      } else {
        setCheckoutMessage("Payment dibuat dan sedang menunggu pembayaran.");
      }
    } catch {
      setCheckoutMessage(
        "Pembayaran belum bisa dibuat. Silakan coba lagi atau hubungi tim Ofissio.",
      );
    } finally {
      setSubmitting(false);
    }
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
    <CheckoutFrame
      step={3}
      title="Review pesanan"
      description="Periksa detail, pilih ongkir, lalu lanjutkan pembayaran atau quotation."
      aside={
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft-sm">
          <h2 className="text-sm font-bold text-ink">Ringkasan</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Subtotal" value={formatIDR(subtotal)} />
            {discountTotal > 0 ? (
              <Row
                label={`Promo ${appliedPromotion?.code ?? ""}`.trim()}
                value={`- ${formatIDR(discountTotal)}`}
              />
            ) : null}
            <Row label="PPN 11%" value={formatIDR(tax)} muted />
            <Row
              label="Ongkos kirim"
              value={
                selectedShippingRate
                  ? selectedShippingRate.price === 0
                    ? "Gratis"
                    : formatIDR(selectedShippingRate.price)
                  : "Belum dipilih"
              }
              muted={!selectedShippingRate}
              italic={!selectedShippingRate}
            />
          </dl>
          <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
            <span className="text-sm font-semibold text-ink">Total</span>
            <span className="text-2xl font-extrabold tracking-tight text-ink-strong tabular-nums">
              {formatIDR(total)}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              className="w-full"
              onClick={requiresEmbroideryConsultation ? handleRequestQuote : handlePayment}
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting
                ? "Memproses..."
                : requiresEmbroideryConsultation
                  ? "Minta Estimasi Bordir"
                  : "Lanjut Pembayaran"}
            </Button>
            {!requiresEmbroideryConsultation ? <Button
              className="w-full"
              variant="outline"
              onClick={handleRequestQuote}
              disabled={submitting}
            >
              Request Quotation
            </Button> : null}
          </div>

          {checkoutMessage && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800"
            >
              {checkoutMessage}
            </p>
          )}

          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-[11px] leading-snug text-brand-800">
            {requiresEmbroideryConsultation
              ? "Produk dengan bordir perlu estimasi supervisor sebelum harga, jadwal, dan pembayaran dikonfirmasi."
              : "Total final dihitung ulang oleh backend. Development memakai payment mock sampai konfigurasi iPaymu resmi diaktifkan."}
          </p>
        </div>
      }
    >
      {/* Items + address + shipping */}
      <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-sm font-bold text-ink">Item pesanan</h2>
            <ul className="mt-3 divide-y divide-line">
              {items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <ProductThumb src={it.image} alt={it.productName} className="h-16 w-16 sm:h-20 sm:w-20" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {it.productName}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {it.color} · {it.totalQty} pcs · {formatIDR(it.finalUnitPrice ?? it.unitPrice)}/pcs
                        {it.quantityTierApplied && it.quantityTierLabel ? ` · Tier ${it.quantityTierLabel}` : ""}
                      </p>
                      {(it.embroideryLines?.length ?? 0) > 0 ? <p className="mt-1 text-[10px] font-semibold text-amber-800">Bordir {formatIDR(it.embroideryTotal)}</p> : null}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-ink tabular-nums">{formatIDR(it.finalEstimatedTotal ?? it.estimatedPrice)}</p>
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
                      onClick={() => {
                        setSelectedAddressId(a.id);
                        setShippingRates([]);
                        setSelectedShippingRateId(null);
                      }}
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

          <section
            className="rounded-2xl border border-line bg-surface p-5"
            aria-labelledby="shipping-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="shipping-heading" className="text-sm font-bold text-ink">
                  Pilihan pengiriman
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Ongkir dihitung melalui backend Ofissio.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCheckShipping()}
                disabled={shippingLoading}
                aria-busy={shippingLoading}
              >
                {shippingLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                {shippingLoading ? "Menghitung…" : "Cek Ongkir"}
              </Button>
            </div>

            {hasMadeToOrder && (
              <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Ongkir produk made-to-order dapat dikonfirmasi kembali melalui
                quotation setelah jadwal produksi dan volume akhir tersedia.
              </div>
            )}

            {shippingRates.length > 0 && (
              <fieldset className="mt-4 grid gap-2">
                <legend className="sr-only">Pilih layanan pengiriman</legend>
                {shippingRates.map((rate) => {
                  const selected = rate.id === selectedShippingRateId;
                  return (
                    <label
                      key={rate.id}
                      className={
                        "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors " +
                        (selected
                          ? "border-brand-600 bg-brand-50/60 ring-1 ring-brand-100"
                          : "border-line hover:border-brand-300")
                      }
                    >
                      <input
                        type="radio"
                        name="shipping-rate"
                        value={rate.id}
                        checked={selected}
                        onChange={() => setSelectedShippingRateId(rate.id)}
                        className="h-4 w-4 accent-brand-700"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          {rate.courierName} · {rate.serviceName}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {rate.estimatedDays}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-ink tabular-nums">
                        {rate.price === 0 ? "Gratis" : formatIDR(rate.price)}
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}
          </section>
      </div>
    </CheckoutFrame>
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
          (italic ? "italic text-xs" : " tabular-nums")
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Condensed order summary for steps 1–2. Desktop-only aside — renders the
 * totals already derived in CheckoutPage, adds no logic of its own.
 */
function CondensedSummary({
  items,
  subtotal,
  discountTotal,
  tax,
  total,
  promotionCode,
}: {
  items: CartLineItem[];
  subtotal: number;
  discountTotal: number;
  tax: number;
  total: number;
  promotionCode?: string;
}) {
  const totalQty = items.reduce((a, it) => a + it.totalQty, 0);
  return (
    <div className="hidden rounded-2xl border border-line bg-surface p-5 shadow-soft-sm lg:block">
      <h2 className="text-sm font-bold text-ink">Ringkasan pesanan</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label={`Subtotal (${totalQty} pcs)`} value={formatIDR(subtotal)} />
        {discountTotal > 0 ? (
          <Row
            label={`Promo ${promotionCode ?? ""}`.trim()}
            value={`- ${formatIDR(discountTotal)}`}
          />
        ) : null}
        <Row label="PPN 11% (estimasi)" value={formatIDR(tax)} muted />
      </dl>
      <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
        <span className="text-sm font-semibold text-ink">Estimasi total</span>
        <span className="text-xl font-extrabold tracking-tight text-ink-strong tabular-nums">
          {formatIDR(total)}
        </span>
      </div>
      <p className="mt-3 text-[11px] leading-snug text-ink-muted">
        Ongkos kirim dihitung pada langkah terakhir setelah alamat dipilih.
      </p>
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
