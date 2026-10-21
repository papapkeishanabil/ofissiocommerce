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
import { resolveOrderProcessingInfo } from "@/features/products/order-processing";
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { ProductThumb } from "@/components/ui/ProductThumb";
import { CompanyProfileForm } from "@/components/company/CompanyProfileForm";
import { CompanyAddressForm } from "@/components/company/CompanyAddressForm";
import { PromotionBox, type PromotionLine } from "@/features/promotions/components/PromotionBox";
import { CheckoutFrame } from "./CheckoutFrame";

/** Payload baris untuk validasi kode promo di PromotionBox. */
function toPromotionLines(items: CartLineItem[]): PromotionLine[] {
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.totalQty,
    subtotal: item.finalEstimatedTotal ?? item.estimatedPrice,
  }));
}

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
  const [addressDirty, setAddressDirty] = useState(false);

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
  const selectedShippingRate = addressDirty ? undefined : shippingRates.find(
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
        orderNote: useCartStore.getState().orderNote,
        items: items.map((item) => ({
          productId: item.productId,
          selectedColor: item.color,
          selectedSleeve: item.selectedSleeve,
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
        orderId?: string;
        message?: string;
      };
      if (!response.ok || !result.ok || !result.orderId) throw new Error(result.message);
      clearCart();
      if (result.paymentUrl) {
        router.push(result.paymentUrl);
      } else {
        router.push(`/orders/${encodeURIComponent(result.orderId)}`);
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

  // Recipient, shipping and summary share one review screen.
  return (
    <CheckoutFrame checkout title="Checkout" description="Lengkapi informasi pengiriman untuk melanjutkan pesanan."
      aside={<div className="space-y-3">
                  <section
            className="rounded-lg border border-line bg-surface p-5"
            aria-labelledby="shipping-heading"
          >
            <div className="flex flex-col items-stretch gap-3">
              <div>
                <h2 id="shipping-heading" className="text-sm font-bold text-ink">
                  Pengiriman
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Pilih layanan pengiriman untuk alamat tujuan Anda.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11 w-full justify-start"
                onClick={() => void handleCheckShipping()}
                disabled={shippingLoading || !selectedAddress || addressDirty}
                aria-busy={shippingLoading}
              >
                {shippingLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                {shippingLoading ? "Menghitung…" : selectedShippingRate ? "Ubah pengiriman" : "Belum dipilih"}
              </Button>
            </div>

            {hasMadeToOrder && (
              <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Ongkir produk made-to-order dapat dikonfirmasi kembali melalui
                quotation setelah jadwal produksi dan volume akhir tersedia.
              </div>
            )}

            {shippingRates.length > 0 && !addressDirty && (
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
                          ? "border-ochre-600 bg-ochre-50 ring-1 ring-ochre-600"
                          : "border-line hover:border-brand-300")
                      }
                    >
                      <input
                        type="radio"
                        name="shipping-rate"
                        value={rate.id}
                        checked={selected}
                        onChange={() => setSelectedShippingRateId(rate.id)}
                        className="h-4 w-4 accent-ochre-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          {rate.courierName}, {rate.serviceName}
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
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-base font-bold">Ringkasan pesanan</h2>
          <SummaryItems items={items} />
          <details className="mt-2 text-xs"><summary className="cursor-pointer text-ink-muted">Rincian biaya</summary><dl className="mt-2 space-y-2"><Row label="Subtotal" value={formatIDR(subtotal)} />{discountTotal>0 && <Row label="Diskon promo" value={formatIDR(discountTotal)} />}<Row label="PPN 11% (estimasi)" value={formatIDR(tax)} /><Row label="Pengiriman" value={selectedShippingRate?formatIDR(shippingCost):"Belum dipilih"} /></dl></details>
          <PromotionBox lines={toPromotionLines(items)} subtotal={clientSubtotal} />
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3"><span className="text-sm font-bold">Total pesanan</span><div className="text-right"><strong className="text-xl tabular-nums">{formatIDR(total)}</strong><p className="text-xs text-ink-muted">{selectedShippingRate?"Termasuk pengiriman":"Menunggu pengiriman"}</p></div></div>
          {checkoutMessage && <p role="alert" className="mt-3 text-xs text-amber-800">{checkoutMessage}</p>}
          {requiresEmbroideryConsultation && <p className="mt-2 text-xs text-ink-muted">Biaya dan jadwal bordir perlu dikonfirmasi sebelum pembayaran.</p>}
          <button className="mt-3 text-xs font-semibold underline" onClick={handleRequestQuote}>Request Quotation</button>
        </section>
      </div>}
      footer={<><div><strong className="text-xl tabular-nums">{formatIDR(total)}</strong><p className="text-xs text-ink-muted">{selectedShippingRate?"Termasuk pengiriman dan estimasi PPN":"Menunggu pengiriman, termasuk estimasi PPN"}</p></div><div className="flex flex-wrap gap-2"><ButtonLink href="/cart" variant="outline">Kembali ke Keranjang</ButtonLink><Button disabled={submitting||shippingLoading} onClick={()=>{
        if (!selectedAddress || addressDirty) { (document.getElementById("checkout-recipient") as HTMLFormElement|null)?.requestSubmit(); return; }
        if (requiresEmbroideryConsultation) { handleRequestQuote(); return; }
        if (!selectedShippingRate) { void handleCheckShipping(); return; }
        handlePayment();
      }}>{submitting?"Memproses...":shippingLoading?"Menghitung ongkir...":!selectedAddress||addressDirty?"Simpan penerima":requiresEmbroideryConsultation?"Minta Estimasi Bordir":!selectedShippingRate?"Pilih pengiriman":"Lanjut Pembayaran"}</Button></div></>}
    >
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="mb-3 text-base font-bold">Informasi penerima</h2>
        {session.company.addresses.length>1 && <label className="mb-3 block text-xs">Alamat tersimpan<select value={effectiveAddressId??""} onChange={e=>{setSelectedAddressId(e.target.value);setShippingRates([]);setSelectedShippingRateId(null);setAddressDirty(false);}} className="mt-1 block h-10 w-full rounded-lg border border-line px-2">{session.company.addresses.map(a=><option key={a.id} value={a.id}>{a.label} ({a.recipientName})</option>)}</select></label>}
        <CompanyAddressForm key={selectedAddress?.id??"new"} checkout address={selectedAddress} onDirtyChange={setAddressDirty} onSuccess={()=>{setShippingRates([]);setSelectedShippingRateId(null);setCheckoutMessage(null);}} />
      </section>
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
    <div className="flex items-start justify-between gap-4">
      <dt className={muted ? "text-ink-muted" : "text-ink"}>{label}</dt>
      <dd
        className={
          (muted ? "text-right text-ink-muted " : "text-right font-semibold text-ink ") +
          (italic ? "italic text-xs" : " tabular-nums")
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Condensed order summary for steps 1-2. Desktop-only aside — renders the
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
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Ringkasan Pesanan</h2>
      <SummaryItems items={items} />
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
      <PromotionBox
        lines={toPromotionLines(items)}
        subtotal={items.reduce((a, it) => a + (it.finalEstimatedTotal ?? it.estimatedPrice), 0)}
      />
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

function SummaryItems({ items }: { items: CartLineItem[] }) {
  return (
    <ul className="mt-4 divide-y divide-line border-b border-line">
      {items.map((item) => {
        const processingInfo = resolveOrderProcessingInfo({
          processRoute: item.processRoute,
          fulfillmentType: item.fulfillmentType,
          leadTimeDays: item.leadTimeDays,
          hasEmbroidery: hasCartCustomization(item),
        });
        return (
          <li key={item.id} className="flex items-start gap-3 py-4 first:pt-0">
            <ProductThumb src={item.image} alt={item.productName} className="h-16 w-16 shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{item.productName}</p>
              <EmbroiderySummary placements={item.embroideryPlacements} sizes={item.sizes} />
              <p className="mt-1 text-xs text-ink-muted">{item.color}{item.selectedSleeve ? `, ${item.selectedSleeve}` : ""}, {Object.entries(item.sizes).filter(([,q])=>q>0).map(([s,q])=>`${s} ${q} pcs`).join(", ")}</p>
              <p className="mt-1 text-xs font-semibold text-ink-muted">{processingInfo.label}: {processingInfo.value}</p>
            </div>
            <div className="text-right text-sm"><p className="font-semibold tabular-nums">{formatIDR(item.finalEstimatedTotal ?? item.estimatedPrice)}</p><p className="mt-1 text-xs text-ink-muted">{item.totalQty} pcs</p></div>
          </li>
        );
      })}
    </ul>
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
import { EmbroiderySummary } from "@/components/configurator/EmbroiderySummary";
