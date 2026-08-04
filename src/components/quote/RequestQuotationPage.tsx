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
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Factory,
  FileText,
  PackageCheck,
  Scissors,
  Send,
  ShieldCheck,
} from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type {
  ProductionRequestBrief,
  QuotationRequirementType,
} from "@/features/quotation/quotation.types";

const EMPTY_PRODUCTION_BRIEF: ProductionRequestBrief = {
  designDescription: "",
  materialPreference: null,
  colorPreference: null,
  sizeNotes: null,
  targetDate: null,
};

export function RequestQuotationPage() {
  const router = useRouter();
  const { session, hydrated: authHydrated, isAuthenticated } = useAuth();
  const cartHydrated = useCartHydrated();
  const items = useCartItems();
  const clearCart = useCartStore((s) => s.clear);
  const openAuth = useUIStore((s) => s.openAuth);

  const [notes, setNotes] = useState("");
  const [requirementType, setRequirementType] =
    useState<QuotationRequirementType>("standard_product");
  const [productionBrief, setProductionBrief] =
    useState<ProductionRequestBrief>(EMPTY_PRODUCTION_BRIEF);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const subtotal = useMemo(
    () => items.reduce((a, it) => a + (it.finalEstimatedTotal ?? it.estimatedPrice), 0),
    [items],
  );
  const cartHasCustomization = useMemo(
    () =>
      items.some(
        (item) =>
          (item.embroideryPlacements?.length ?? 0) > 0 ||
          Boolean(item.customization?.trim()),
      ),
    [items],
  );

  useEffect(() => {
    if (cartHasCustomization && requirementType === "standard_product") {
      setRequirementType("standard_customization");
    }
  }, [cartHasCustomization, requirementType]);

  useEffect(() => {
    if (!authHydrated) return;
    if (!isAuthenticated) openAuth({ kind: "request_quote" });
  }, [authHydrated, isAuthenticated, openAuth]);

  if (!authHydrated || !cartHydrated) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
        <div className="h-24 w-full animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">Login diperlukan</h1>
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
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted text-ink-subtle">
          <FileText className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">Keranjang kosong</h1>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          Untuk produk standar, tambahkan produk dari katalog. Jika Anda ingin desain,
          model, bahan, pola, atau ukuran sendiri, mulai tanpa keranjang melalui brief
          Full Custom.
        </p>
        <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href="/catalog">Telusuri katalog</ButtonLink>
          <ButtonLink href="/custom-request" variant="outline">
            Buat brief Full Custom
          </ButtonLink>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    if (!session || submitting) return;
    if (
      requirementType === "custom_production" &&
      productionBrief.designDescription.trim().length < 10
    ) {
      setSubmitMessage(
        "Jelaskan desain atau kebutuhan produksi khusus minimal 10 karakter.",
      );
      document.getElementById("production-design-description")?.focus();
      return;
    }
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
          requirementType,
          productionBrief:
            requirementType === "custom_production"
              ? cleanProductionBrief(productionBrief)
              : null,
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
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:py-8">
      <section className="animate-fade-in-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-6 shadow-glow-brand lg:px-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-ochre-500/20 blur-3xl" />
        <div className="relative">
          <p className="type-eyebrow text-brand-200">Request Quotation</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white lg:text-[1.75rem]">
            Ajukan quotation dari keranjang
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-brand-100">
            Tim Ofissio akan meninjau kebutuhan Anda dan mengirim penawaran harga
            resmi. Tentukan dulu apakah kebutuhan Anda berupa produk standar,
            customization ringan, atau produksi khusus.
          </p>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
        <div className="space-y-4">
          <RequirementTypeSelector
            value={requirementType}
            cartHasCustomization={cartHasCustomization}
            onChange={setRequirementType}
          />

          {requirementType === "custom_production" ? (
            <ProductionBriefFields
              value={productionBrief}
              onChange={setProductionBrief}
            />
          ) : null}

          <section className="animate-fade-in-up rounded-2xl border border-line bg-surface p-5 shadow-soft-sm">
            <SectionTitle>Item yang diajukan</SectionTitle>
            <ul className="mt-3 divide-y divide-line">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-3 py-3 transition-colors hover:bg-surface-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {it.productName}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {it.color} · {it.totalQty} pcs
                      {it.customization ? ` · ${it.customization}` : ""}
                    </p>
                    {(it.embroideryLines?.length ?? 0) > 0 ? <p className="mt-1 text-[10px] font-semibold text-amber-800">Bordir {formatIDR(it.embroideryTotal)} · {it.embroideryLines.map((line) => line.label.replace("Bordir ", "")).join(", ")}</p> : null}
                    {(it.missingEmbroideryPricingZones?.length ?? 0) > 0 ? <p className="mt-1 text-[10px] font-semibold text-amber-800">Harga bordir perlu dikonfirmasi admin.</p> : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-extrabold text-ink">
                      {formatIDR(it.finalEstimatedTotal ?? it.estimatedPrice)}
                    </p>
                    {it.quantityTierApplied && it.quantityTierLabel ? (
                      <p className="text-[10px] font-semibold text-brand-700">Tier harga: {it.quantityTierLabel}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
              <span className="text-[11px] text-ink-muted">Estimasi subtotal</span>
              <div className="text-right leading-none">
                <p className="text-lg font-extrabold tracking-tight text-ink-strong">
                  {formatIDR(subtotal)}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted">
                  Harga final ditentukan tim Ofissio.
                </p>
              </div>
            </div>
          </section>

          <section className="animate-fade-in-up rounded-2xl border border-line bg-surface p-5 shadow-soft-sm">
            <SectionTitle>Catatan untuk tim Ofissio</SectionTitle>
            <Field
              label="Catatan untuk tim Ofissio"
              htmlFor="quote-notes"
              hint="Informasi tambahan untuk sales yang belum tercakup pada pilihan di atas."
            >
              <textarea
                id="quote-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Contoh: alamat proyek, PIC tambahan, atau instruksi komunikasi."
                className="mt-2 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-soft-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </Field>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft-sm">
            <div className="flex items-center gap-2.5 border-b border-line bg-gradient-to-r from-brand-50 to-transparent px-5 py-3.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-700 text-white">
                <FileText className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-bold text-ink">Konfirmasi</h2>
            </div>
            <div className="p-5">
              <p className="text-xs leading-relaxed text-ink-muted">
                Setelah dikirim, quotation berstatus <strong>submitted</strong>.
                Notifikasi email dikirim jika provider email server sudah
                dikonfigurasi.
              </p>
              <div className="mt-4 rounded-xl bg-surface-muted p-3 text-xs text-ink-muted">
                <p className="font-bold text-ink">Rute yang diajukan</p>
                <p className="mt-1">{requirementSummary(requirementType)}</p>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                aria-busy={submitting}
              >
                <Send className="h-4 w-4" />
                {submitting ? "Memproses..." : "Kirim Request Quotation"}
              </Button>
              {submitMessage && (
                <p role="alert" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800">
                  {submitMessage}
                </p>
              )}
              <ButtonLink href="/cart" variant="ghost" className="mt-2 w-full">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke keranjang
              </ButtonLink>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-ink">
      <span className="h-4 w-1.5 rounded-full bg-brand-600" aria-hidden />
      {children}
    </h2>
  );
}

function RequirementTypeSelector({
  value,
  cartHasCustomization,
  onChange,
}: {
  value: QuotationRequirementType;
  cartHasCustomization: boolean;
  onChange: (value: QuotationRequirementType) => void;
}) {
  const options = [
    {
      value: "standard_product" as const,
      title: "Produk standar",
      description: "Tanpa bordir atau perubahan produk.",
      route: "Fulfillment",
      Icon: PackageCheck,
      disabled: cartHasCustomization,
    },
    {
      value: "standard_customization" as const,
      title: "Produk + customization",
      description: "Produk standar dengan bordir, sablon, DTF, atau nama.",
      route: "Customization",
      Icon: Scissors,
      disabled: false,
    },
    {
      value: "custom_production" as const,
      title: "Produksi khusus",
      description: "Desain, model, bahan, pola, atau ukuran dibuat khusus.",
      route: "Production / SPK",
      Icon: Factory,
      disabled: false,
    },
  ];

  return (
    <fieldset className="rounded-2xl border border-line bg-surface p-5 shadow-soft-sm">
      <legend className="px-1 text-base font-bold text-ink">Jenis kebutuhan</legend>
      <p className="mt-1 text-sm text-ink-muted">
        Pilihan ini menentukan alur kerja setelah quotation disetujui.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {options.map(({ Icon, ...option }, index) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              style={{ animationDelay: `${index * 60}ms` }}
              className={`hover-lift animate-fade-in-up relative min-w-0 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-brand-300 ${
                option.disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-65"
                  : selected
                    ? "cursor-pointer border-brand-500 bg-brand-50"
                    : "cursor-pointer border-line bg-white hover:border-brand-300"
              }`}
            >
              <input
                type="radio"
                name="requirement-type"
                value={option.value}
                checked={selected}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {selected && !option.disabled ? (
                <span className="absolute right-3 top-3 text-brand-600">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              ) : null}
              <span className="flex items-start gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
                    selected ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{option.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-ink-muted">
                    {option.description}
                  </span>
                  <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-brand-800 ring-1 ring-line">
                    {option.route}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-ochre-200 bg-ochre-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-amber-950">
          <strong>Memulai tanpa produk katalog?</strong> Gunakan jalur Full Custom jika
          desain, model, bahan, pola, dan ukurannya dibuat dari awal.
        </p>
        <ButtonLink href="/custom-request" variant="outline" className="shrink-0 bg-white">
          Buka brief Full Custom
        </ButtonLink>
      </div>
      {cartHasCustomization ? (
        <p className="mt-3 text-xs font-semibold text-amber-800">
          Produk standar tanpa custom tidak tersedia karena keranjang sudah memiliki
          logo atau customization. Hapus customization di keranjang jika tidak diperlukan.
        </p>
      ) : null}
    </fieldset>
  );
}

function ProductionBriefFields({
  value,
  onChange,
}: {
  value: ProductionRequestBrief;
  onChange: (value: ProductionRequestBrief) => void;
}) {
  function update<K extends keyof ProductionRequestBrief>(
    key: K,
    next: ProductionRequestBrief[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-soft-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
          <Factory className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold text-ink">Brief produksi khusus</h2>
          <p className="mt-1 text-sm text-amber-950/75">
            Data ini membantu sales menilai desain, bahan, pola, estimasi biaya, dan
            lead time sebelum membuat penawaran.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <Field
          label="Desain, model, atau kebutuhan khusus"
          htmlFor="production-design-description"
          hint="Wajib. Jelaskan perbedaan dari produk standar dan hasil yang diharapkan."
        >
          <textarea
            id="production-design-description"
            rows={4}
            required
            minLength={10}
            maxLength={1200}
            value={value.designDescription}
            onChange={(event) => update("designDescription", event.target.value)}
            placeholder="Contoh: Kemeja lapangan lengan panjang dengan dua saku, ventilasi punggung, dan pola khusus perusahaan."
            className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-base text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <ProductionTextInput
          id="production-material"
          label="Preferensi bahan"
          value={value.materialPreference}
          placeholder="Contoh: ripstop 190 gsm"
          onChange={(next) => update("materialPreference", next)}
        />
        <ProductionTextInput
          id="production-color"
          label="Preferensi warna"
          value={value.colorPreference}
          placeholder="Contoh: navy dan safety orange"
          onChange={(next) => update("colorPreference", next)}
        />
        <ProductionTextInput
          id="production-size-notes"
          label="Ukuran atau pola khusus"
          value={value.sizeNotes}
          placeholder="Contoh: size chart perusahaan terpisah"
          onChange={(next) => update("sizeNotes", next)}
        />
        <div>
          <label htmlFor="production-target-date" className="text-sm font-bold text-ink">
            Target kebutuhan
          </label>
          <div className="relative mt-2">
            <CalendarDays className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-ink-muted" />
            <input
              id="production-target-date"
              type="date"
              value={value.targetDate ?? ""}
              onChange={(event) => update("targetDate", event.target.value || null)}
              className="min-h-11 w-full rounded-xl border border-amber-200 bg-white py-2 pl-10 pr-3 text-base text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductionTextInput({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  placeholder: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={id}
        value={value ?? ""}
        maxLength={300}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder={placeholder}
        className="mt-2 min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-base text-ink shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

function requirementSummary(type: QuotationRequirementType) {
  switch (type) {
    case "standard_product":
      return "Fulfillment — picking, packing, dan shipping produk standar.";
    case "standard_customization":
      return "Customization — produk standar diproses bordir/sablon/custom ringan sebelum QC dan packing.";
    case "custom_production":
      return "Production / SPK — review brief, approval desain, material, cutting, sewing, finishing, dan QC.";
  }
}

function cleanProductionBrief(
  brief: ProductionRequestBrief,
): ProductionRequestBrief {
  return {
    designDescription: brief.designDescription.trim(),
    materialPreference: brief.materialPreference?.trim() || null,
    colorPreference: brief.colorPreference?.trim() || null,
    sizeNotes: brief.sizeNotes?.trim() || null,
    targetDate: brief.targetDate || null,
  };
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
